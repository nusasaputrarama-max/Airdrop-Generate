# AGBadge — Airdrop Generate Agent ID Holder Badge

Spec for the Binance Agent ID Hackathon entry (vehicle: AIRDROP GENERATE).
Branch: `muse/ag-badge-hackathon` (PR #6 → `development`).
Status: contract hardening + automated test/CI implementation. Deployment,
frontend integration, distribution and merge remain separate owner-approved gates.

## 1. Hackathon facts

- Campaign: Agent ID Hackathon by Binance Wallet + BNB Chain.
- Submission: 2026-11-18 08:00 UTC → **2026-12-09 08:00 UTC**.
- Rewards: 60,000 USDC total.
  - Data-driven Project Awards: 29,000 USDC, top 10 by on-chain metrics.
  - Innovation Award: 29,000 USDC, judged on Agent ID depth, practicality,
    completion and innovation.
  - Community Promotion: 2,000 USDC.
- Hard requirements include deployment on BNB Chain, verified source on BscScan,
  open-source code and active Agent ID use.
- Innovation Award eligibility requires a live product and at least 30 Agent ID
  addresses interacting with submitted contracts during the submission period.
- Agent ID registry (SPACE ID Agent ID):
  `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`.
  `balanceOf(address) > 0` is the holder gate.

Verify all campaign terms against the official announcement before submission;
this document is not a substitute for the current rules.

## 2. Product and contract policy

A free, permanently soulbound ERC-721 badge. One per wallet. Mintable only by
wallets that hold an Agent ID. The caller pays network gas; the contract charges
no mint fee. No monetary value or returns are promised.

- Name: `Airdrop Generate Agent Badge`; symbol: `AGBADGE`.
- Gate: `AgentID.balanceOf(msg.sender) > 0` and
  `hasClaimed[msg.sender] == false`.
- Token IDs are sequential from 1.
- **Permanent lock:** transfers and burns are both prohibited. There is no
  external burn function. `hasClaimed` is never reset.
- **ERC-5192:** `locked(tokenId)` returns true for an existing badge;
  nonexistent token queries revert. `supportsInterface(0xb45a3c0e)` returns
  true and `Locked(tokenId)` is emitted when a badge is minted.
- Metadata is fully on-chain: `tokenURI` returns a Base64 JSON data URI with
  an inline Base64 SVG image.
- Admin: none. No owner, upgradeability, pause, privileged mint, payable
  function, receive/fallback handler or withdrawal path.
- Events: ERC-721 `Transfer`, ERC-5192 `Locked`, and
  `BadgeMinted(address indexed holder, uint256 indexed tokenId)`.

## 3. Security design

- The registry gate uses only `balanceOf`; the registry is not assumed to be
  enumerable and the contract does not call `tokenOfOwnerByIndex`.
- `hasClaimed[msg.sender]` is set before `_safeMint`, so a receiver callback
  cannot re-enter and mint a second badge.
- `_update` allows only initial minting. Once a token exists, every subsequent
  ownership update reverts, including transfer and burn paths.
- ERC-721 approvals cannot bypass the transfer restriction because all transfer
  paths reach the guarded `_update`.
- Registry address is a compile-time constant. A registry migration would
  require a newly deployed contract; the existing contract cannot be upgraded.
- ERC-5192 interface reference: https://eips.ethereum.org/EIPS/eip-5192

## 4. Automated verification

The PR adds a Foundry test suite and GitHub Actions workflow. Tests cover:

1. Non-Agent-ID holder cannot mint.
2. Agent-ID holder can mint once; second mint reverts.
3. ERC-721 `transferFrom` and `safeTransferFrom` revert.
4. Approval does not enable transfer.
5. ERC-5192, ERC-721 and ERC-165 interface detection; locked-state query.
6. On-chain metadata data-URI output.
7. No public burn path; transfer-to-zero cannot destroy a badge.
8. Reentrant mint from an ERC-721 receiver is blocked.

CI runs the pinned npm/solc compile and `forge test -vvv`. A successful local
compile is not evidence that CI or all tests have passed. Record the actual
GitHub Actions result before calling the contract test-verified.

## 5. Red-line compliance

- No web-based QR login, QR pairing or pairing codes.
- No bypass of user confirmation; users sign their own mint transaction.
- No unauthorized transfers; badges are permanently non-transferable.
- No credential collection (seed phrases, private keys, API secrets).
- No promised income, monetary value or returns.
- No arbitrary name.ai-to-wallet lookup. Only the connected caller's own
  Agent ID balance is checked by the contract.
- No wash interactions, fake accounts or volume manipulation.
- No Binance/BNB brand impersonation in badge name or symbol.
- Contract source is public in this repository; BscScan verification remains
  a deployment-stage requirement.

Frontend claims in the product must continue to follow these restrictions.
The contract itself does not implement wallet connection, QR login or a site flow.

## 6. Deployment and release gates

The following are deliberately **not** performed by this PR:

- No testnet or mainnet deployment.
- No live-site modification or frontend claim flow.
- No submission of a contract address to the hackathon.
- No distribution campaign or artificial interaction generation.
- No merge into `development`.

Each requires a separate review and explicit owner approval. Before deployment,
confirm the registry address and behavior on BNB Chain, run CI, deploy to testnet,
exercise the real wallet flow, verify source on BscScan, and review the exact
transaction and contract address.

## 7. Owner decisions and remaining work

1. **Repository license:** no LICENSE file is added by this change. MIT is
   proposed but requires Rama's explicit decision. An SPDX header alone does
   not grant the repository a complete project-level license.
2. **Deployment:** mainnet deployment requires Rama's explicit approval.
3. **Frontend:** live-site integration requires a separate approval and security
   review, including clear display of the contract address before signing.
4. **Distribution:** use organic outreach only. Confirm channel details and
   realistic user value before planning a 30-holder target.
5. **CI result:** confirm the GitHub Actions run is green; do not infer success
   merely because the workflow file exists.
6. **Independent review:** this change is not a formal third-party smart-contract
   audit. A further review is required before mainnet deployment.
