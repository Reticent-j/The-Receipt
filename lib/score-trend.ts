import { parseScoresJson, SCORE_DIMENSIONS } from "@/lib/profile-scores";
import type { Database } from "@/types/database";

type RatingRow = Database["public"]["Tables"]["ratings"]["Row"];

export type MonthlyScorePoint = {
  month: string;
  label: string;
  average: number;
  count: number;
};

function averageScoreForRating(r: RatingRow): number | null {
  if (!r.both_submitted || !r.scores) return null;
  const parsed = parseScoresJson(r.scores);
  const vals = SCORE_DIMENSIONS.map((k) => parsed[k]).filter(
    (v): v is number => v != null
  );
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * Buckets completed ratings by calendar month (UTC) for a simple trend line.
 */
export function buildMonthlyScoreTrend(ratings: RatingRow[]): MonthlyScorePoint[] {
  const buckets = new Map<
    string,
    { sum: number; count: number; label: string }
  >();

  for (const r of ratings) {
    const avg = averageScoreForRating(r);
    if (avg == null) continue;
    const d = new Date(r.created_at);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("en", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(d);
    const cur = buckets.get(key) ?? { sum: 0, count: 0, label };
    cur.sum += avg;
    cur.count += 1;
    cur.label = label;
    buckets.set(key, cur);
  }

  const keys = Array.from(buckets.keys()).sort();
  return keys.map((month) => {
    const b = buckets.get(month)!;
    return {
      month,
      label: b.label,
      average: b.count > 0 ? b.sum / b.count : 0,
      count: b.count,
    };
  });
}
