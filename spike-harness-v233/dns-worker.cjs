// DNS worker tiruan untuk pengujian startup (v2.3.2).
// Memegang interval ref'd agar event loop tetap hidup — simulasi handle
// native c-ares yang menggantung (lihat temuan PARENT-T1b v2.3.1).
// Abaikan SIGTERM (stubborn); SIGKILL tetap membunuh (tidak dapat diabaikan).
'use strict';
process.on('SIGTERM', () => { /* sengaja diabaikan: stubborn */ });
setInterval(() => {}, 1000); // handle aktif ref'd
console.log(JSON.stringify({ ready: true, pid: process.pid }));
setInterval(() => {}, 60000);
