// Canonical contract-address rules for the verified catalog (F-004/F-045).
//
// SATU aturan, dipakai aplikasi DAN database — ekspresi di bawah ini
// HARUS tetap identik dengan generated column
// `contract_address_canonical` + CHECK `projects_contract_format_ck`
// di migrasi 0006 (site/drizzle/0006_unified_ownership_and_uniqueness.sql).
// Bila aturan ini berubah, migrasi + CHECK + tes H-CAT-13 harus berubah
// bersama dalam satu change set (pelajaran U-95: himpunan input app-vs-DB
// pernah menyimpang pada prefix `0X` dan alamat tanpa prefix).
//
// Peta chain -> tipe alamat (K-8, TABEL MENGIKAT — memperluas peta =
// keputusan owner + migrasi, bukan tebakan implementor):
//   EVM family (hex, case-insensitive): 'BNB Chain', 'Ethereum', 'Base',
//     'Arbitrum', 'Polygon', 'opBNB', 'Robinhood Chain'.
//   Solana family (base58, case-sensitive): 'Solana'.
//   Chain di luar peta -> INSERT DITOLAK (CHECK di DB + throw di sini).
//
// Aturan kanonik (v2.3.21 §4.3b):
//   EVM: trim -> strip prefix `0x` ATAU `0X` (bila ada) -> lowercase ->
//     simpan dengan prefix '0x' ('0x' + 40 hex lowercase).
//     Validasi: 40 char hex, dengan ATAU tanpa prefix `0x`/`0X`.
//   Solana: trim SAJA (huruf TIDAK diubah). Validasi: 32..44 char base58
//     (tanpa 0/O/I/l/spasi).
//   NULL -> NULL (tidak masuk unique index).
//
// CATATAN — satu arah keketatan (fail-closed, disengaja): fungsi ini JUGA
// menolak karakter non-base58 pada alamat Solana, sementara CHECK DB
// hanya memeriksa panjang + larangan 0/O/I/l/spasi. Arah yang mengikat
// adalah: setiap string yang DITOLAK CHECK pasti DITOLAK di sini
// (tidak ada jalan app yang lolos tapi DB menolak — diuji H-CAT-13);
// sebaliknya, aplikasi boleh lebih ketat daripada CHECK. Nilai kanonik
// untuk semua input yang DITERIMA keduanya adalah IDENTIK (diuji
// H-CAT-13 pada 12 baris seed + korpus edge).

/** Chains whose contract addresses are EVM hex (case-insensitive). */
export const EVM_CHAINS: ReadonlySet<string> = new Set([
  "BNB Chain",
  "Ethereum",
  "Base",
  "Arbitrum",
  "Polygon",
  "opBNB",
  "Robinhood Chain",
]);

/** The Solana chain label (base58 addresses, case-sensitive). */
export const SOLANA_CHAIN = "Solana";

/** Every chain the catalog accepts (CHECK `projects_chain_allowlist_ck`). */
export const CHAIN_ALLOWLIST: ReadonlySet<string> = new Set([
  ...EVM_CHAINS,
  SOLANA_CHAIN,
]);

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const HEX40_RE = /^[0-9a-fA-F]{40}$/;

/**
 * Canonicalize a contract address for one chain, exactly as the DB does.
 * Returns the canonical form, or null when the input address is null.
 * THROWS (fail-closed) when the chain is unknown or the address format is
 * invalid for that chain type — callers must treat a throw as a rejection,
 * never as "store it anyway".
 */
export function canonicalizeContractAddress(
  chain: string,
  address: string | null,
): string | null {
  if (address === null) return null;
  const trimmed = address.trim();
  if (chain === SOLANA_CHAIN) {
    if (!BASE58_RE.test(trimmed)) {
      throw new Error(
        "Alamat kontrak Solana harus 32–44 karakter base58 (tanpa 0/O/I/l/spasi).",
      );
    }
    return trimmed;
  }
  if (EVM_CHAINS.has(chain)) {
    const hex = trimmed.replace(/^0[xX]/, "");
    if (!HEX40_RE.test(hex)) {
      throw new Error(
        "Alamat kontrak EVM harus 0x + 40 karakter heksadesimal, atau 40 karakter heksadesimal tanpa prefix.",
      );
    }
    return `0x${hex.toLowerCase()}`;
  }
  throw new Error(`Chain tidak dikenal: ${chain}.`);
}
