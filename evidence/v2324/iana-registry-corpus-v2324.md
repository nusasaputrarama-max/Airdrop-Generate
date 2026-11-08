# Korpus Registry IANA — F-049 (v2.3.24)

Sumber: diambil LANGSUNG (live fetch) 2026-11-08 ~16:25 WIB dari:

- https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml
- https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml

Kedua registry tercantum "Last Updated: 2025-10-09" pada halaman yang
diambil — sama dengan tanggal yang disebut audit V18. Isi tabel di bawah
disalin dari halaman tersebut (kolom Globally Reachable = GR).

Aturan produk: DENY semua entri GR=False (+ CGNAT 100.64/10 keputusan
owner, bukan entri registry); ALLOW entri GR=True; parent-prefix
default-deny untuk 2001::/23 dengan exception GR=True yang lebih spesifik.

## IPv4 — semua entri registry

| Prefix | Nama | GR | Disposisi di `classifyIp` |
| --- | --- | --- | --- |
| 0.0.0.0/8 | This network | False | DENY `ipv4-this-network-0/8` |
| 0.0.0.0/32 | This host on this network | False | DENY (di dalam /8) |
| 10.0.0.0/8 | Private-Use | False | DENY `ipv4-private-10/8` |
| 100.64.0.0/10 | Shared Address Space (CGNAT) | False | DENY `ipv4-cgnat-100.64/10` |
| 127.0.0.0/8 | Loopback | False | DENY `ipv4-loopback-127/8` |
| 169.254.0.0/16 | Link Local | False | DENY `ipv4-link-local-169.254/16` |
| 172.16.0.0/12 | Private-Use | False | DENY `ipv4-private-172.16/12` |
| 192.0.0.0/24 | IETF Protocol Assignments | False | DENY `ipv4-ietf-192.0.0/24` |
| 192.0.0.0/29 | IPv4 Service Continuity Prefix | False | DENY (di dalam /24) |
| 192.0.0.8/32 | IPv4 dummy address | False | DENY (di dalam /24) |
| 192.0.0.9/32 | Port Control Protocol Anycast | **True** | ALLOW — exception di dalam /24 |
| 192.0.0.10/32 | TURN Anycast | **True** | ALLOW — exception di dalam /24 |
| 192.0.0.170/32, 192.0.0.171/32 | NAT64/DNS64 Discovery | False | DENY (di dalam /24) |
| 192.0.2.0/24 | Documentation (TEST-NET-1) | False | DENY `ipv4-documentation-192.0.2/24` |
| 192.31.196.0/24 | AS112-v4 | **True** | ALLOW (tidak pernah di-deny) |
| 192.52.193.0/24 | AMT | **True** | ALLOW (tidak pernah di-deny) |
| 192.88.99.0/24 | Deprecated (6to4 Relay Anycast) | (kosong — terminated 2015-03) | DENY `ipv4-6to4-relay-192.88.99/24` — lihat catatan |
| 192.88.99.2/32 | 6to4-relay anycast address | False | DENY (di dalam /24 di atas) |
| 192.168.0.0/16 | Private-Use | False | DENY `ipv4-private-192.168/16` |
| 192.175.48.0/24 | Direct Delegation AS112 Service | **True** | ALLOW (tidak pernah di-deny) |
| 198.18.0.0/15 | Benchmarking | False | DENY `ipv4-benchmarking-198.18/15` |
| 198.51.100.0/24 | Documentation (TEST-NET-2) | False | DENY `ipv4-documentation-198.51.100/24` |
| 203.0.113.0/24 | Documentation (TEST-NET-3) | False | DENY `ipv4-documentation-203.0.113/24` |
| 240.0.0.0/4 | Reserved | False | DENY `ipv4-reserved-240/4` |
| 255.255.255.255/32 | Limited Broadcast | False | DENY (di dalam 240/4; cek /4 mendahului) |

Catatan 192.88.99.0/24: registry hanya menandai 192.88.99.2/32 sebagai
GR=False; baris /24-nya kosong (terminated 2015-03). Seluruh /24 di-deny
di sini — DELIBERATELY STRICTER daripada huruf registry — karena blok
ini adalah relay 6to4 yang sudah deprecated dan tidak ada layanan HTTP
publik di dalamnya. H-IP-02 menguji .1 dan .2.

## IPv6 — semua entri registry

| Prefix | Nama | GR | Disposisi di `classifyIp` |
| --- | --- | --- | --- |
| ::1/128 | Loopback Address | False | DENY `ipv6-loopback-::1` |
| ::/128 | Unspecified Address | False | DENY `ipv6-unspecified-::` |
| ::ffff:0:0/96 | IPv4-mapped Address | False | Diekstrak ke IPv4-nya lalu diklasifikasi sebagai IPv4 |
| 64:ff9b::/96 | IPv4-IPv6 Translat. (NAT64 WKP) | **True** | Diekstrak ke IPv4-nya lalu diklasifikasi sebagai IPv4 |
| 64:ff9b:1::/48 | IPv4-IPv6 Translat. (local-use) | False | Diekstrak ke IPv4-nya (dengan validasi u/suffix) lalu diklasifikasi sebagai IPv4 |
| 100::/64 | Discard-Only Address Block | False | DENY `ipv6-discard-100::/64` |
| 100:0:0:1::/64 | Dummy IPv6 Prefix (RFC 9780, 2025-04) | False | DENY `ipv6-dummy-100:0:0:1::/64` (cek lama sudah benar: byte 0–7 = 0100:0000:0000:0001) |
| 2001::/23 | IETF Protocol Assignments | False [1] | DEFAULT-DENY `ipv6-ietf-2001::/23-default-deny`, kecuali exception GR=True di bawah |
| 2001::/32 | TEREDO | N/A [2] | DENY `ipv6-teredo-2001::/32` (dipertahankan: N/A bukan True; Teredo membungkus IPv4) |
| 2001:1::1/128 | Port Control Protocol Anycast | **True** | ALLOW — exception 2001::/23 |
| 2001:1::2/128 | TURN Anycast | **True** | ALLOW — exception 2001::/23 |
| 2001:1::3/128 | DNS-SD Service Registration Protocol Anycast | **True** | ALLOW — exception 2001::/23 |
| 2001:2::/48 | Benchmarking | False | DENY `ipv6-benchmarking-2001:2::/48` |
| 2001:3::/32 | AMT | **True** | ALLOW — exception 2001::/23 |
| 2001:4:112::/48 | AS112-v6 | **True** | ALLOW — exception 2001::/23 |
| 2001:10::/28 | Deprecated (previously ORCHID) | (kosong — terminated 2014-03) | DENY `ipv6-deprecated-orchid-2001:10::/28` |
| 2001:20::/28 | ORCHIDv2 | **True** | ALLOW — exception 2001::/23 (KEPUTUSAN F-049: ikuti IANA) |
| 2001:30::/28 | Drone Remote ID DETs Prefix | **True** | ALLOW — exception 2001::/23 |
| 2001:db8::/32 | Documentation | False | DENY `ipv6-documentation-2001:db8::/32` |
| 2002::/16 | 6to4 | N/A [3] | DENY `ipv6-6to4-2002::/16` (dipertahankan: N/A bukan True) |
| 2620:4f:8000::/48 | Direct Delegation AS112 Service | **True** | ALLOW (tidak pernah di-deny; di luar 2001::/23) |
| 3fff::/20 | Documentation | False | DENY `ipv6-documentation-3fff::/20` |
| 5f00::/16 | Segment Routing (SRv6) SIDs | False | DENY `ipv6-srv6-5f00::/16` (BARU F-049) |
| fc00::/7 | Unique-Local | False | DENY `ipv6-ula-fc00::/7` |
| fe80::/10 | Link-Local Unicast | False | DENY `ipv6-link-local-fe80::/10` |

[1] "Unless allowed by a more specific allocation." — dasar
default-deny 2001::/23 dengan exception.
[2]/[3] Lihat RFC masing-masing; N/A diperlakukan sebagai DENY
(keputusan konservatif yang sudah ada sebelum F-049, dipertahankan).

Di luar registry: ff00::/8 multicast tetap DENY
(`ipv6-multicast-ff00::/8`) — multicast IPv6 diatur registry terpisah,
dan perilaku ini sudah ada sebelum F-049; dipertahankan sebagai
keputusan konservatif, sejajar dengan multicast IPv4 224/4.

## Keputusan eksplisit F-049 — 2001:20::/28

ALLOW, mengikuti IANA (Globally Reachable=True). Alasan: ORCHIDv2
adalah identifier kriptografis, bukan host yang routable; tidak ada
alasan produk untuk memblokir rentang yang IANA nyatakan reachable
sementara entry anycast GR=True tetangganya (2001:1::1–3, 2001:3::/32,
2001:4:112::/48, 2001:30::/28) di-allow. Kebijakan produk yang sengaja
lebih ketat TIDAK diadopsi. Test lama yang mengharapkan DENY
(H-SSRF-04) diperbaiki; H-IP-06 membuktikan ALLOW.

## Cakupan tes

`test-ip-registry-v2324.ts` (H-IP-01..H-IP-08) menguji setiap baris
tabel di atas: satu alamat wakil per entri GR=False (DENY dengan reason
tepat), setiap exception GR=True (ALLOW), probe default-deny
2001::/23 (2001:1::4, 2001:0:ffff::1, 2001:1::ffff), dan batas
(2001:200::1 di luar /23 tetap ALLOW sebagai unicast global biasa;
192.0.0.9/.10 ALLOW; 192.88.99.1/.2 DENY).
