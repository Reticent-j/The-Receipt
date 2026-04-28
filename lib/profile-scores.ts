import type { Json } from "@/types/database";

/** Keys stored in `ratings.scores` jsonb for completed ratings */
export const SCORE_DIMENSIONS = [
  "reliability",
  "communication",
  "respect",
  "effort",
  "character",
] as const;

export type ScoreDimensionKey = (typeof SCORE_DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<ScoreDimensionKey, string> = {
  reliability: "Reliability",
  communication: "Communication",
  respect: "Respect",
  effort: "Effort",
  character: "Character",
};

export type DimensionAverages = Partial<
  Record<ScoreDimensionKey, { average: number; count: number }>
>;

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/** Parse unlocked `scores` jsonb from a single rating row */
export function parseScoresJson(scores: Json): Partial<Record<ScoreDimensionKey, number>> {
  if (!scores || typeof scores !== "object" || Array.isArray(scores)) {
    return {};
  }
  const obj = scores as Record<string, unknown>;
  const out: Partial<Record<ScoreDimensionKey, number>> = {};
  for (const key of SCORE_DIMENSIONS) {
    const n = readNumber(obj[key]);
    if (n != null) out[key] = Math.min(10, Math.max(0, n));
  }
  return out;
}

/** Aggregate dimension averages across completed ratings for the rated person */
export function aggregateDimensionAverages(
  ratings: Array<{ scores: Json }>
): DimensionAverages {
  const sums: Record<ScoreDimensionKey, { sum: number; count: number }> = {
    reliability: { sum: 0, count: 0 },
    communication: { sum: 0, count: 0 },
    respect: { sum: 0, count: 0 },
    effort: { sum: 0, count: 0 },
    character: { sum: 0, count: 0 },
  };

  for (const row of ratings) {
    const parsed = parseScoresJson(row.scores);
    for (const key of SCORE_DIMENSIONS) {
      const v = parsed[key];
      if (v != null) {
        sums[key].sum += v;
        sums[key].count += 1;
      }
    }
  }

  const result: DimensionAverages = {};
  for (const key of SCORE_DIMENSIONS) {
    const { sum, count } = sums[key];
    if (count > 0) {
      result[key] = { average: sum / count, count };
    }
  }
  return result;
}

/** Single headline score /10: prefer live average from completed ratings when present, else profile column. */
export function headlineScoreOutOf10(
  profileOverall: number,
  dimensionAverages: DimensionAverages
): number {
  const entries = Object.values(dimensionAverages).filter(Boolean) as Array<{
    average: number;
    count: number;
  }>;
  if (entries.length > 0) {
    const sum = entries.reduce((acc, e) => acc + e.average, 0);
    return Math.min(10, Math.max(0, sum / entries.length));
  }
  const n = Number(profileOverall);
  if (Number.isFinite(n) && n >= 0) {
    return Math.min(10, Math.max(0, n));
  }
  return 0;
}

export function scoreIndicatorClass(score: number): string {
  if (score < 5) return "text-red-400";
  if (score <= 7) return "text-amber-400";
  return "text-emerald-400";
}

export function scoreGlowClass(score: number): string {
  if (score < 5) return "shadow-red-500/25";
  if (score <= 7) return "shadow-amber-400/30";
  return "shadow-emerald-400/25";
}
