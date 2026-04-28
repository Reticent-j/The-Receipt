declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    /** Public app URL for SMS deep links (same value as Edge `NEXT_PUBLIC_APP_URL`). */
    NEXT_PUBLIC_APP_URL?: string;
    /** Server-only: Auth Admin delete user (`/api/account/delete`). Never expose to the client. */
    SUPABASE_SERVICE_ROLE_KEY?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    STRIPE_PRICE_PREMIUM_MONTHLY?: string;
    STRIPE_PRICE_LISTING_BOOST?: string;
  }
}
