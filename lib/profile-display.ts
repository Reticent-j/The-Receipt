import type { ListingCategory, RelationshipType } from "@/types/database";

export const RELATIONSHIP_LABEL: Record<RelationshipType, string> = {
  romantic: "Romantic",
  roommate: "Roommate",
  coworker: "Coworker",
  friend: "Friend",
  transaction: "Transaction",
};

export const LISTING_CATEGORY_LABEL: Record<ListingCategory, string> = {
  roommate: "Roommate",
  selling: "Selling",
  gig: "Gig",
  dating: "Dating",
  other: "Other",
};

export function formatPriceUsd(price: number | null): string {
  if (price == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}
