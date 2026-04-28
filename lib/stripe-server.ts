import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  if (!stripe) {
    stripe = new Stripe(key, { typescript: true });
  }
  return stripe;
}

export function getPremiumPriceId(): string {
  const id = process.env.STRIPE_PRICE_PREMIUM_MONTHLY;
  if (!id) {
    throw new Error("Missing STRIPE_PRICE_PREMIUM_MONTHLY");
  }
  return id;
}

export function getBoostPriceId(): string {
  const id = process.env.STRIPE_PRICE_LISTING_BOOST;
  if (!id) {
    throw new Error("Missing STRIPE_PRICE_LISTING_BOOST");
  }
  return id;
}

export function appOrigin(): string {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL?.trim()) {
    const host = process.env.VERCEL_URL.trim().replace(/^https?:\/\//, "");
    return `https://${host.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}
