/**
 * Signals — AIRDROP GENERATE (AG-001)
 *
 * STATUS: STUB (registry) — daftar sinyal yang sudah berjalan di artifact live.
 * Entri di sini mendokumentasikan sinyal yang ADA, bukan mengimplementasikannya.
 * Implementasi tiap sinyal tinggal di modulnya masing-masing saat M3.
 */

export interface SignalDefinition {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  /** Status di produk live. */
  readonly liveStatus: "live" | "planned";
}

/** Sinyal yang sudah berjalan di `checkLink` artifact live. */
export const LIVE_SIGNALS: readonly SignalDefinition[] = [
  {
    key: "domain_age",
    label: "Umur domain",
    description: "Umur domain dari data registrasi RDAP. Domain sangat muda menaikkan skor.",
    liveStatus: "live",
  },
  {
    key: "known_bad_domain",
    label: "Domain drainer terbukti",
    description:
      "Domain cocok dengan daftar drainer terkonfirmasi (solbarn.cc, sharkmoon.tech). Menyentuhnya berarti otomatis BAHAYA.",
    liveStatus: "live",
  },
  {
    key: "redirect_chain",
    label: "Rantai redirect",
    description:
      "Redirect diikuti hop demi hop (maks 6); seluruh rantai dicatat sebagai bukti; hop ke domain terlarang/berbahaya menaikkan skor.",
    liveStatus: "live",
  },
  {
    key: "connect_wallet",
    label: "Permintaan connect wallet",
    description: "Halaman meminta pengguna menghubungkan wallet.",
    liveStatus: "live",
  },
  {
    key: "signing_code",
    label: "Kode penandatanganan transaksi",
    description: "Halaman mengandung kode yang meminta tanda tangan transaksi.",
    liveStatus: "live",
  },
  {
    key: "bait_language",
    label: "Bahasa iming-iming klaim gratis",
    description: "Teks klaim/imbalan yang menekan urgensi (mis. 'claim now', 'limited').",
    liveStatus: "live",
  },
  {
    key: "obfuscation",
    label: "Kode tersamar",
    description: "Kode yang disamarkan (mis. atob, string terenkode) di halaman.",
    liveStatus: "live",
  },
  {
    key: "contract_addresses",
    label: "Alamat kontrak/token",
    description:
      "Alamat yang ditampilkan divalidasi formatnya (EVM 0x+40 hex, Solana base58 32–44) dan dicek kesesuaiannya dengan chain yang diklaim.",
    liveStatus: "live",
  },
  {
    key: "official_links",
    label: "Tautan resmi",
    description: "Ada/tidaknya tautan resmi (situs/X proyek) di halaman.",
    liveStatus: "live",
  },
];

/** Sinyal yang direncanakan (Phase 3–4), belum ada implementasi. */
export const PLANNED_SIGNALS: readonly SignalDefinition[] = [
  {
    key: "contract_risk",
    label: "Risiko fungsi kontrak",
    description: "Pemeriksaan fungsi berbahaya pada kontrak (owner mint, blacklist, pajak).",
    liveStatus: "planned",
  },
  {
    key: "wallet_history",
    label: "Riwayat alamat wallet",
    description: "Alamat tujuan diperiksa terhadap pola drainer/kolektor.",
    liveStatus: "planned",
  },
  {
    key: "community_reports",
    label: "Laporan komunitas",
    description: "Jumlah laporan pengguna terhadap URL/domain ini.",
    liveStatus: "planned",
  },
];
