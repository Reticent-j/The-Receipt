/** Receipt Premium — $9.99/mo (see /premium). */
export const PREMIUM_MONTHLY_DISPLAY = "$9.99/mo";
/** Listing boost — $3.99 one-time. */
export const BOOST_ONETIME_DISPLAY = "$3.99";

/** Max active listings for free accounts. */
export const FREE_TIER_ACTIVE_LISTING_LIMIT = 2;

/** Stripe subscription statuses that unlock premium features. */
export function isPremiumSubscription(
  status: string | null | undefined
): boolean {
  return status === "active" || status === "trialing";
}

export function isBoostActive(boostExpiresAt: string | null | undefined): boolean {
  if (!boostExpiresAt) return false;
  return new Date(boostExpiresAt).getTime() > Date.now();
}

export function currentMonthKey(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
