# SSRF Evaluation v2.3.6 — Final Security Review Follow-up

**FINAL STATUS: DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED**

This is a documentation-only design review. It does not authorize or perform application-code changes, database/catalog changes, production builds, deployment, or Link Scanner reactivation. No experiment is represented as completed unless evidence is explicitly recorded.

## 1. Executive decision

The conceptual use of Linux `flock(2)` remains acceptable only if all cooperating processes lock the same persistent inode, the lock directory is protected from unauthorized mutation, and the actual production filesystem semantics are demonstrated.

Two material gaps remain:

- A `/proc` inspection followed by `kill(pid, SIGKILL)` has a PID-reuse TOCTOU race. Rechecking starttime and command line narrows the interval but does not bind the later signal to the inspected process.
- A never-unlink rule is not self-enforcing. If process A holds a lock on inode I1 and its pathname is unlinked, process B can create inode I2 at the same pathname and lock it. Both may then believe they have exclusive access.

**Decision:** retain DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED. All staging gates below must pass with reproducible evidence and receive separate security approval.

## 2. U-38 — PID reuse during SIGKILL

### 2.1 Race assessment

The sequence “read `/proc/<pid>/stat` and starttime; read `cmdline`; validate; call `kill(pid, SIGKILL)`” is not atomic. The target may exit after inspection and the kernel may reuse its numeric PID before `kill(2)`. The signal then targets the process currently owning that PID, not necessarily the inspected process.

A second starttime/cmdline check immediately before `kill` only reduces the interval. Another exit/reuse can occur after that final read and before the signal syscall. Starttime granularity, parsing errors, namespace differences, and mutable command-line data add limitations. **These checks do not eliminate PID-reuse risk.**

### 2.2 Preferred candidate: pidfd

Linux process file descriptors provide a stronger identity-bound signaling primitive:

- `pidfd_open(pid, 0)` obtains a descriptor for the process currently associated with the PID (Linux 5.3+).
- `pidfd_send_signal(pidfd, SIGKILL, NULL, 0)` signals through that descriptor (Linux 5.1+).
- After acquisition, later reuse of the numeric PID does not redirect a signal through that pidfd. If the referenced process exits, signaling normally fails with `ESRCH`; treat this as target exit, not as a reason to retry using numeric `kill(pid)`.

**Candidate sequence:** validate PID and target policy; acquire pidfd as early as possible; retain it while checking the expected identity and relevant procfs attributes; reject unavailable, ambiguous, or mismatched identity; signal only through `pidfd_send_signal`; handle `ESRCH`, permission errors, unsupported syscall, and seccomp denial distinctly; close the descriptor on every path. Never fall back to numeric `kill(pid)`.

**Important limitation:** pidfd protects against PID reuse after acquisition. If the original target exits and its PID is reused before `pidfd_open`, the pidfd can refer to the replacement. Compare the acquired target against a previously captured expected identity while holding the pidfd. If intended identity cannot be established, do not signal. PID namespace mapping must be accounted for. `/proc/self/fdinfo/<pidfd>` can provide diagnostic information on supported kernels but is not, alone, a complete identity proof.

### 2.3 Bun, bun:ffi, and sandbox compatibility

Compatibility is **not established** by this review. It must be tested with the exact production runtime artifact and sandbox.

- `bun:ffi` availability depends on Bun version, packaging, platform, and native-call restrictions. A developer-machine import test does not prove production availability.
- FFI may call libc-exported pidfd symbols where present; symbol availability varies by libc/version. Direct syscalls are ABI- and architecture-sensitive and must not be improvised.
- Seccomp, container policy, PID namespaces, missing symbols, or FFI restrictions may block the mechanism.
- Record Bun version/artifact digest, OS image, architecture, libc, kernel, FFI load result, syscall result and errno, seccomp profile, namespace, and launch path.
- A successful FFI import alone does not prove the syscalls are permitted.

Use pidfd only if acquisition and signaling pass in the production-equivalent Bun artifact, kernel, namespace, and sandbox. If unavailable or blocked, do not silently downgrade to numeric PID signaling.

### 2.4 Safe fallback

No procfs-read-then-`kill(pid)` sequence proves target identity at signal time. If pidfd is unavailable:

1. Prefer a supervisor-native, identity-aware stop operation after verifying its target-selection semantics.
2. If the application created and still owns the child, retain a live runtime child-process handle and use the deployed Bun version's documented termination API, tested in the production launch environment.
3. Do not reconstruct identity later from a PID file alone.
4. If no identity-bound handle or verified supervisor operation exists, fail closed: do not signal; record the inability to establish the target safely and escalate to operator-controlled recovery.

Process groups are not automatically safe substitutes: PGIDs can be reused and group signaling can affect unrelated members. Any group-based design needs separate ownership, membership, reuse, and supervisor tests.

### 2.5 Required U-38 experiments

- Open pidfd for a known child, terminate it, induce/wait for PID reuse where feasible, and prove signaling through the original pidfd does not signal the replacement.
- Verify expected `ESRCH` behavior after target exit.
- Test when the original exits before pidfd acquisition; reject a replacement unless expected identity matches.
- Test permission denial, unsupported kernel/syscall, seccomp denial, namespace mismatch, FFI unavailable, malformed PID, and all error paths.
- Verify no pidfd failure path falls back to numeric `kill(pid)`.
- Run using the exact production Bun artifact and sandbox profile.

These are proposed experiments; no result is asserted here.

## 3. U-33 — Never-unlink and operational controls

### 3.1 Inode semantics

A lock is associated with an open file description/inode relationship, not merely a pathname. Unlinking the pathname does not invalidate an existing descriptor or transfer its lock to a replacement inode. If A holds I1, the pathname is unlinked, and B creates I2 at that pathname, B may lock I2 while A still holds I1. Both may believe they have exclusive access.

The invariant must cover application processes, deployment/rollback scripts, cleanup jobs, container entrypoints, operators, backup/restore tools, and host automation.

### 3.2 Permissions and ownership

Candidate baseline for a local Linux filesystem:

- Use a dedicated, stable lock directory outside ephemeral/versioned release directories and symlink-swapped paths.
- Own it by the dedicated service account; use mode `0700` if only that account should manage it. If multiple trusted service identities must cooperate, use a dedicated group and carefully reviewed permissions (for example `0770` with setgid).
- Create the lock file with restrictive permissions such as `0600`; validate owner, group, mode, file type, and directory ancestry.
- Untrusted users, unrelated services, web workers, and general tooling must not have directory write permission. Directory write permission enables unlink/rename/replacement.
- Audit ACLs, supplementary groups, inherited permissions, parent directory permissions, bind mounts, and mount configuration; mode bits alone are insufficient.
- Reject symlinks and non-regular files. Where supported, use directory-relative/no-follow open operations and validate the opened descriptor with `fstat`; avoid separate pathname-check-then-open logic.
- Avoid sharing the service account with unrelated workloads.
- Root, equivalent capabilities, compromised service credentials, or privileged host administrators can bypass these boundaries.

### 3.3 Deployment, rollback, and maintenance protocol

This is a required operational protocol, not a claim that current tooling already enforces it.

**Deployment**
1. Keep lock directory and pathname stable across releases; never place them inside versioned release directories or symlink-swapped paths.
2. Separate deployment privileges from lock-directory write access. Deployment tooling must not replace the lock entry while service processes are active.
3. Drain/stop the service through its supervisor before maintenance affecting the lock directory.
4. Confirm all instances and child processes that may hold the descriptor have exited. Use supervisor state and host-level descriptor/process inspection; do not rely on one PID file.
5. Deploy without deleting, renaming, truncating, or recreating the lock file.
6. On restart, verify path, device/inode, owner, permissions, filesystem, and supervisor state; record release and deployment identity.

**Rollback**
1. Use the same drain-and-confirm procedure.
2. Preserve lock directory and inode; never restore an old lock-file copy from an artifact/archive.
3. Switch only the application release pointer/artifact through the reviewed deployment mechanism.
4. If rollback cannot guarantee lock-path preservation, block it until a maintenance window proves no process can hold the old lock.

**Maintenance**
- Treat the lock file as a persistent coordination object, not a stale temporary file.
- Exclude the lock directory and entry from cleanup, rotation, archive extraction, backup restore, configuration-management replacement, `rm`, `mv`, and atomic rename operations.
- Ownership, ACL, mount, or directory-structure changes require a controlled maintenance window after all holders exit.
- Alert on missing entry, inode/device change, owner/mode/ACL drift, symlink substitution, and mount changes. Monitoring detects; it does not prevent.

### 3.4 Recovery if lock file is deleted while a process is active

Treat this as a coordination-integrity incident. Do not recreate the pathname and resume service while any process may still hold the old inode.

1. Stop admission of new work and prevent new instances from starting through the supervisor/orchestrator.
2. Quiesce all instances and child processes that may hold the old descriptor.
3. Identify holders through supervisor state and host-level descriptor/process inspection. If complete identification is uncertain, keep service stopped and escalate.
4. Only after all potential holders exit and supervisor quiescence is confirmed, inspect directory entries, symlinks, ACLs, ownership, and mount configuration.
5. Recreate the lock entry once under the intended identity and permissions; record device/inode metadata.
6. Start one controlled instance, verify it opens and locks the expected inode, then bring up remaining instances.
7. Record cause, affected interval, quiescence evidence, and corrective actions; review deployment/cleanup permissions.

If old holders cannot be identified or stopped, do not repair by merely touching the pathname. A controlled service/host restart may be necessary to ensure no descriptor to the old inode survives, subject to operational safety.

### 3.5 OS-enforced versus runbook controls

| Control | Class | Limitation |
|---|---|---|
| Directory owner/mode | OS-enforced | Root/capabilities and ACLs can override; audit effective access |
| ACLs/group membership | OS-enforced | Audit inherited and supplementary access |
| Stable mount/protected parent | OS/host configuration | Privileged remount or namespace changes can alter it |
| Kernel flock semantics | Kernel | Coordinates only participants locking the same inode |
| No-follow open and fstat validation | Kernel-assisted application control | Correct race-free implementation required |
| Deployment identity denied directory write | OS identity boundary | Fails if deployment runs as root or shares service credentials |
| Never-unlink runbook | Procedural only | Cannot stop a privileged or mistaken actor |
| Deployment checklist/approval | Procedural only | Depends on compliance and audit quality |
| Cleanup exclusion | Configuration/procedural | Future changes can regress it |
| Monitoring/alerting | Detection only | Alert may arrive after split-lock interval begins |

## 4. Revised design v2.3.6

This is the proposed design boundary for further review, not approved implementation guidance.

### 4.1 Lock lifecycle

- Use one stable lock directory on a production-equivalent filesystem whose flock behavior is verified.
- Keep the lock file persistent; never unlink, rotate, replace, rename, or recreate it during normal operation.
- All participants open the same canonical path and validate the opened descriptor's file type, owner, mode, and device/inode expectations.
- Acquire the lock before the critical section and retain the descriptor for the entire protected lifetime. Release by closing the descriptor; do not unlink as a release operation.
- Treat lock failure, unexpected metadata, filesystem uncertainty, and inode drift as fail-closed conditions.
- Require all participants to use the same locking protocol. flock is advisory; non-participants can ignore it.

### 4.2 Process termination

- Preferred destructive signaling: pidfd-based signaling to an identity-bound process handle, after policy validation and successful exact-environment tests.
- Procfs starttime/cmdline checks followed by numeric kill are not PID-reuse safe.
- If pidfd is unavailable, use a verified supervisor lifecycle operation or retained child handle. Otherwise fail closed and escalate.
- Never downgrade from pidfd failure to numeric-PID signaling.
- Record target-selection evidence, pidfd acquisition/signal result and errno, and supervisor outcome without logging secrets.

### 4.3 Failure handling and observability

- Lock errors and identity uncertainty stop the protected action.
- Distinguish target-exited (ESRCH), permission failure, unsupported syscall, sandbox denial, and validation failure.
- Keep structured, access-controlled diagnostics; redact command-line arguments that may contain credentials.
- Alert on lock-path absence, inode/device changes, permission/ACL drift, and filesystem changes.
- Successful lock acquisition does not prove every process participates; maintain a participant inventory.

## 5. Updated risk matrix

| ID | Risk | Likelihood | Impact | Proposed control | Residual risk/disposition |
|---|---|---:|---:|---|---|
| U-38-A | PID exits and PID reused between procfs check and numeric kill | Medium | Critical | pidfd open, identity validation, pidfd_send_signal | Low but non-zero; without pidfd use verified supervisor handle or fail closed |
| U-38-B | PID already reused before pidfd acquisition | Medium | High | Compare with previously captured expected identity; validate while holding pidfd | Identity-source and namespace ambiguity remain |
| U-38-C | Bun FFI/syscall unavailable or sandbox-blocked | Unknown | High | Exact-artifact staging gate; explicit capability gate; no numeric fallback | Open until evidence passes |
| U-38-D | Incorrect FFI ABI, symbol, syscall number, or errno handling | Medium | Critical | Prefer supported libc symbols; architecture review; negative-path tests | Requires implementation review and tests |
| U-33-A | Lock pathname unlinked while old inode remains locked | Medium | Critical | Protected stable directory; persistent inode; restricted write access | Privileged actors and procedural failures remain |
| U-33-B | New process locks replacement inode while old holder retains old inode | Medium | Critical | Quiesce-before-repair; inode monitoring; recovery protocol | Cannot safely recreate pathname while holders remain |
| U-33-C | Non-cooperating process ignores advisory flock | Medium | High | Inventory participants; access boundaries | flock cannot compel non-participants |
| U-33-D | Unexpected filesystem/flock/network filesystem behavior | Unknown | High | Production-equivalent mount tests; conditional NFS validation | Open until filesystem evidence exists |
| U-33-E | Operator/cleanup/deployment tooling replaces inode | Medium | Critical | Separate privileges; exclusions; audit; alerts | Runbook alone is not an OS boundary |
| U-33-F | Supervisor/process-group behavior differs from assumptions | Unknown | High | Lifecycle, process-tree, orphan, and restart tests | Open until tested |

Likelihoods are qualitative design judgments, not measured probabilities. Reassess using staging evidence.

## 6. Staging prerequisites and PASS/FAIL matrix

All mandatory gates must pass with reproducible evidence before implementation can be considered. Retain raw output, exact artifact/environment identifiers, timestamps, and reviewer sign-off. An unsupported assertion is not a PASS.

| Gate | Required evidence | PASS | FAIL/BLOCK |
|---|---|---|---|
| ST-01 Runtime artifact | Production Bun binary/artifact digest, Bun version, OS image, architecture, libc, kernel, launch command/environment | Exact target runtime identified and matched to intended production | Unknown/mismatched artifact or developer-only evidence |
| ST-02 bun:ffi | Import/load and native symbol resolution using exact artifact under production-equivalent sandbox | Required FFI path callable, or separately tested non-FFI design selected | Missing, blocked, unverified, or only tested outside sandbox |
| ST-03 pidfd (if selected) | Kernel support; pidfd_open/send_signal results and errno; exited-target and PID-reuse tests; no-fallback trace | Both calls pass in target environment; reuse test passes; no numeric fallback | Either call blocked/unsupported, identity ambiguous, fallback exists, or evidence absent |
| ST-04 Lock filesystem | Filesystem type, mount options, device, namespace, directory ancestry, ACLs, ownership, modes, symlink checks | Production-equivalent filesystem and effective permissions documented and stable | Unknown filesystem/permissions or untrusted directory write access |
| ST-05 flock semantics | Two-process contention, release-on-close, crash/termination, same-inode, concurrent-instance tests | One cooperating holder enters critical section at a time on same inode; release matches design | Overlap, differing inodes, or semantics mismatch |
| ST-06 /proc | Mount/visibility, hidepid, namespace mapping, permissions, required fields/parser tests | Required data consistently available to service identity; namespace assumptions documented | Missing/partial/unreadable procfs or ambiguous mapping |
| ST-07 Supervisor/process groups | Supervisor type/version/config, child ownership, drain/stop/restart, process-tree/group, orphan/reparent tests | Lifecycle ownership and target selection reproducible; no unrelated process affected | Unknown behavior, unsafe PGID assumption, orphaned child, broad signal impact |
| ST-08 SU-T1..SU-T9 | Individual definitions, procedures, raw logs, expected/actual results, reviewer | All nine executed, pass, failures resolved and rerun | Any not run, missing, flaky/unexplained, or failing |
| ST-09 NFS (conditional) | If production uses NFS: version, mount options, server/client config, lock-manager, contention/crash/reconnect tests | Production-equivalent NFS behavior passes | Production uses NFS but evidence absent or semantics unreliable; otherwise mark N/A with filesystem proof |
| ST-10 Lock operations | Deployment/rollback/cleanup/backup/restore/maintenance dry-run and identity permission evidence | All workflows preserve directory and inode while holders exist | Any workflow replaces/deletes entry or depends only on unverified checklist |
| ST-11 Recovery drill | Staging simulation of missing/replaced lock path; quiescence evidence and recovery logs | Service blocked until all old holders exit; one canonical inode recreated and verified | Online recreation while holders may remain or incomplete holder inventory |
| ST-12 Observability | Alert tests for missing path, inode/device drift, permission/ACL drift, mount changes | Actionable alerts reach accountable operator | No detection, unowned alerts, or detection misrepresented as prevention |

### 6.1 SU-T1..SU-T9 status

These identifiers are carried forward as unexecuted prerequisites in this review. Their original definitions and expected outcomes must be mapped to the existing test suite; this document does not invent their scope.

| Test | Status | Evidence required |
|---|---|---|
| SU-T1 | NOT RUN / evidence not supplied | Definition, raw result, environment, reviewer |
| SU-T2 | NOT RUN / evidence not supplied | Definition, raw result, environment, reviewer |
| SU-T3 | NOT RUN / evidence not supplied | Definition, raw result, environment, reviewer |
| SU-T4 | NOT RUN / evidence not supplied | Definition, raw result, environment, reviewer |
| SU-T5 | NOT RUN / evidence not supplied | Definition, raw result, environment, reviewer |
| SU-T6 | NOT RUN / evidence not supplied | Definition, raw result, environment, reviewer |
| SU-T7 | NOT RUN / evidence not supplied | Definition, raw result, environment, reviewer |
| SU-T8 | NOT RUN / evidence not supplied | Definition, raw result, environment, reviewer |
| SU-T9 | NOT RUN / evidence not supplied | Definition, raw result, environment, reviewer |

If prior records show a test has run, change its status only with a traceable evidence reference and reviewer confirmation.

## 7. Evidence and experiment register

No experiments were executed by this review on the target repository, production runtime, kernel, sandbox, filesystem, or supervisor. No empirical claim is made about Bun FFI, pidfd availability, production flock semantics, procfs visibility, NFS behavior, or SU-T1..SU-T9.

| Evidence | Status |
|---|---|
| Exact production Bun artifact and bun:ffi test | NOT VERIFIED |
| pidfd_open/send_signal in production-equivalent sandbox | NOT RUN |
| PID-reuse safety experiment | NOT RUN |
| Production lock filesystem and flock contention/crash tests | NOT VERIFIED |
| /proc visibility and namespace behavior | NOT VERIFIED |
| Supervisor, process-group, orphan, restart behavior | NOT VERIFIED |
| SU-T1..SU-T9 | NOT RUN / evidence not supplied |
| NFS validation | CONDITIONAL — only if production uses NFS |
| Lock-path deletion recovery drill | NOT RUN |
| Deployment/rollback/maintenance inode-preservation drill | NOT RUN |

For reproducibility, retain test ID, date/time, operator, host/container image, kernel, architecture, libc, Bun artifact digest/version, sandbox/seccomp profile, filesystem/mount details, test harness revision, raw stdout/stderr, exit status, errno, and reviewer disposition. Redact secrets and sensitive command-line arguments. Test negative paths as well as happy paths.

## 8. Risks that cannot be eliminated completely

1. **Privileged lock-directory mutation:** root or equivalent host privilege can change ownership, mounts, permissions, or directory entries. flock cannot defend against a fully privileged administrator.
2. **Advisory-lock participation:** flock cannot stop a process that ignores the protocol. Correctness depends on complete participant inventory and access boundaries.
3. **Pre-pidfd identity ambiguity:** pidfd prevents later PID reuse from redirecting a signal, but cannot prove a PID still denotes the original target if reuse occurred before pidfd acquisition. A trustworthy expected identity remains necessary.
4. **Runtime/kernel variance:** Bun, libc, kernel, namespace, seccomp, and container changes can invalidate prior evidence. Revalidate after material platform changes.
5. **Supervisor semantics:** process ownership, reparenting, group membership, and restart behavior can change. Group signaling is not inherently identity-safe.
6. **Filesystem behavior:** lock semantics depend on actual filesystem and mount configuration. Local development results do not prove production behavior, especially on network filesystems.
7. **Operational error:** runbooks can be skipped or bypassed. Only OS-enforced privilege separation and tested deployment controls reduce this risk; documentation and alerts alone do not prevent inode replacement.
8. **Detection latency:** inode monitoring may detect replacement only after it occurs and cannot prove no split-lock interval existed.
9. **Unmodeled failures:** kernel/runtime defects, host compromise, storage faults, and undocumented platform changes remain outside this design's guarantees.

The system owner must explicitly accept residual risks before any future implementation decision. If a risk is unacceptable, change the architecture rather than claim it has been eliminated.

## 9. Approval gates and next decision

Implementation remains blocked until:

- ST-01 through ST-08 and ST-10 through ST-12 are PASS with retained evidence.
- ST-09 is PASS if production uses NFS; otherwise mark NOT APPLICABLE and attach proof of the production filesystem.
- SU-T1..SU-T9 have documented results and reviewer sign-off.
- pidfd is proven in the exact production-equivalent runtime/sandbox, or a verified supervisor/retained-child-handle fallback is selected. No unsafe numeric-PID fallback is permitted.
- Lock-directory ownership, effective permissions, deployment identity boundaries, and inode-preservation behavior are verified.
- Recovery drill proves no replacement inode is created while any old holder may remain.
- A separate security review evaluates the evidence and records an explicit implementation decision.

A PASS in the matrix is a prerequisite, not automatic approval. Any code change, production build, deployment, database/catalog change, or Link Scanner activation requires separate authorization and review.

## 10. Final status

**DESIGN REVIEW ONLY — IMPLEMENTATION NOT APPROVED.**

This document records design revisions, proposed experiments, risk updates, and staging gates. It does not authorize implementation, production build, deployment, database/catalog mutation, or Link Scanner reactivation. No claim is made that required experiments have passed.
