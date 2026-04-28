export function listingDescriptionPreview(
  description: string | null,
  max = 120
): string {
  if (!description?.trim()) return "";
  const t = description.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

export function isListingNew(createdAtIso: string, hours = 24): boolean {
  const created = new Date(createdAtIso).getTime();
  return Date.now() - created < hours * 60 * 60 * 1000;
}

export function formatListedAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(d);
}

export function headlineScoreForPoster(
  overall: number,
  totalRatings: number
): number {
  const n = Number(overall);
  if (Number.isFinite(n) && totalRatings > 0) {
    return Math.min(10, Math.max(0, n));
  }
  if (Number.isFinite(n) && n > 0) return Math.min(10, Math.max(0, n));
  return 0;
}

export type FeedCategoryFilter =
  | "all"
  | "roommate"
  | "selling"
  | "gig"
  | "other";

export function parseFeedCategory(
  raw: string | string[] | undefined
): FeedCategoryFilter {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const allowed: FeedCategoryFilter[] = [
    "all",
    "roommate",
    "selling",
    "gig",
    "other",
  ];
  if (v && allowed.includes(v as FeedCategoryFilter)) {
    return v as FeedCategoryFilter;
  }
  return "all";
}
