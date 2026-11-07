// AUTH-T9a — lock path di filesystem read-only.
// Mencoba open O_RDWR|O_CREAT pada /sys (mount read-only): HARUS gagal
// (EROFS/EPERM/ENOENT). Parent WAJIB keluar NOT_READY tanpa fallback
// ke mode tanpa lock. Bila open entah bagaimana berhasil, itu FAIL
// (lingkungan tidak seperti yang diasumsikan).
// Usage: bun rofs-test.js <lockPath>
import fs from "node:fs";
const lockPath = process.argv[2];
try {
  const fd = fs.openSync(lockPath, fs.constants.O_RDWR | fs.constants.O_CREAT, 0o644);
  console.log(JSON.stringify({ test: "AUTH-T9a", openSucceeded: true, reason: "UNEXPECTED-OPEN-SUCCEEDED", lockPath }));
  try { fs.closeSync(fd); } catch {}
  process.exit(1);
} catch (e) {
  console.log(JSON.stringify({ test: "AUTH-T9a", openSucceeded: false, errno: e.code || String(e), failClosed: true, lockPath }));
  process.exit(0);
}
