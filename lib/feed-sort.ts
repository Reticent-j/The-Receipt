import type { Database } from "@/types/database";

type ListingRow = Database["public"]["Tables"]["listings"]["Row"];

export function isListingBoostActive(
  listing: Pick<ListingRow, "boost_expires_at">
): boolean {
  if (!listing.boost_expires_at) return false;
  return new Date(listing.boost_expires_at).getTime() > Date.now();
}

/** Boosted listings first (within the same category filter), then newest. */
export function sortListingsForFeed(rows: ListingRow[]): ListingRow[] {
  const now = Date.now();
  return [...rows].sort((a, b) => {
    const aBoost =
      !!a.boost_expires_at && new Date(a.boost_expires_at).getTime() > now;
    const bBoost =
      !!b.boost_expires_at && new Date(b.boost_expires_at).getTime() > now;
    if (aBoost !== bBoost) {
      return aBoost ? -1 : 1;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
