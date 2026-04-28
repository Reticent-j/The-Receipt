import type { Json } from "@/types/database";

export const RATING_DIMENSION_KEYS = [
  "reliability",
  "communication",
  "respect",
  "effort",
  "character",
] as const;

export type RatingDimensionKey = (typeof RATING_DIMENSION_KEYS)[number];

/** Slider copy for the person being rated (same labels both parties use). */
export const RATING_DIMENSION_HELP: Record<
  RatingDimensionKey,
  { title: string; hint: string }
> = {
  reliability: {
    title: "Reliability",
    hint: "Did they follow through on what they said they would do?",
  },
  communication: {
    title: "Communication",
    hint: "Were they clear, honest and responsive?",
  },
  respect: {
    title: "Respect",
    hint: "Did they treat you with dignity and consideration?",
  },
  effort: {
    title: "Effort",
    hint: "Did they show up and put in the work?",
  },
  character: {
    title: "Character",
    hint: "Are they fundamentally a good person?",
  },
};

export type SidePayload = {
  reliability: number;
  communication: number;
  respect: number;
  effort: number;
  character: number;
  review: string;
};

export function emptySidePayload(): SidePayload {
  return {
    reliability: 7,
    communication: 7,
    respect: 7,
    effort: 7,
    character: 7,
    review: "",
  };
}

/** Build jsonb stored in rater_score_data / rated_score_data (includes review). */
export function sidePayloadToJsonb(payload: SidePayload): Json {
  const review = payload.review.trim().slice(0, 280);
  return {
    reliability: payload.reliability,
    communication: payload.communication,
    respect: payload.respect,
    effort: payload.effort,
    character: payload.character,
    ...(review ? { review } : {}),
  };
}

/** Public `scores` column on unlock: dimension averages from rater’s view of rated_id (profile feed). */
export function publicScoresFromRaterData(raterData: Json | null): Json {
  if (!raterData || typeof raterData !== "object" || Array.isArray(raterData)) {
    return {};
  }
  const o = raterData as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const k of RATING_DIMENSION_KEYS) {
    const n = Number(o[k]);
    if (Number.isFinite(n)) out[k] = Math.min(10, Math.max(1, n));
  }
  return out;
}

export function reviewFromSideData(data: Json | null): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const r = (data as Record<string, unknown>).review;
  if (typeof r !== "string" || !r.trim()) return null;
  return r.trim().slice(0, 280);
}

export function parseSidePayload(data: Json | null): Partial<SidePayload> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const o = data as Record<string, unknown>;
  const out: Partial<SidePayload> = {};
  for (const k of RATING_DIMENSION_KEYS) {
    const n = Number(o[k]);
    if (Number.isFinite(n)) out[k] = Math.min(10, Math.max(1, n));
  }
  if (typeof o.review === "string") out.review = o.review;
  return out;
}
