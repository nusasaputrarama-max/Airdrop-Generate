/**
 * Risk Scoring — AIRDROP GENERATE (AG-001)
 *
 * STATUS: STUB — BELUM DIIMPLEMENTASIKAN (engine terpisah).
 * Scoring per sinyal sudah berjalan di artifact live; file ini adalah kerangka
 * engine terstruktur untuk Phase 3: bobot terdokumentasi, ambang yang dapat
 * dievaluasi dari data beta, dan jejak audit per skor.
 */

import type { ScanSignal } from "../scanner/link-scanner";
import type { Classification } from "./classification";

export interface ScoringWeights {
  /** Bobot per sinyal, keyed by signal key (lihat scanner/signals.ts). */
  readonly weights: Readonly<Record<string, number>>;
  /** Ambang skor untuk klasifikasi default (lihat CLASSIFICATION.md §4). */
  readonly thresholds: {
    readonly suspiciousMin: number;
    readonly maliciousScoreMin: number;
  };
}

/** STUB — bobot final ditentukan setelah evaluasi data beta, bukan dikarang. */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  weights: {},
  thresholds: { suspiciousMin: 30, maliciousScoreMin: 80 },
};

export interface ScoredResult {
  readonly score: number;
  readonly classification: Classification;
  readonly signals: readonly ScanSignal[];
}

/** STUB — implementasi menjumlahkan scoreImpact sinyal + aturan klasifikasi. */
export function scoreSignals(
  _signals: readonly ScanSignal[],
  _weights: ScoringWeights = DEFAULT_WEIGHTS,
): ScoredResult {
  throw new Error(
    "STUB: scoreSignals belum diimplementasikan — bobot final ditentukan setelah evaluasi data beta.",
  );
}
