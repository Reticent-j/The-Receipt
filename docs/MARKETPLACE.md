# Marketplace — implementation status

> **Environment & repo setup:** [GETTING_STARTED.md](./GETTING_STARTED.md) · **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)

## Done (application)

- **`/feed`** — Active listings grid, filter chips (All / Roommate / Selling / Gigs / Other; “All” includes **dating**), poster joined from `profiles`, floating **+** to `/listings/new`.
- **`/listings/[id]`** — Full detail, image gallery, seller sidebar (large Receipt score, top 3 dimensions from completed ratings, inquiry dialog placeholder), related same-category listings.
- **`/listings/new`** — Auth-gated create flow with preview `ListingCard`, up to **4** image uploads to bucket **`listing-images`**, `createListing` server action.
- **`components/listings/ListingCard.tsx`** — Receipt score badge (color bands), poster row + score again, “New” &lt;24h, category/price/location/time.
- **`lib/listing-score-badge.tsx`** — Shared score pill styling.
- **`lib/listing-utils.ts`** — Relative time, description preview, feed category parsing.
- **`app/actions/listings.ts`** — Zod-validated insert + revalidation.
- **`components/profile/profile-listings-grid.tsx`** — Refactored to use `ListingCard` + poster profile.

## Done (SQL migration — you must apply)

- **`supabase/migrations/20260429120000_listing_images_storage.sql`** — Public bucket `listing-images`, RLS for `authenticated` upload/update/delete under own `{user_id}/` prefix.

## Not done / follow-ups

- **Inquiry** — UI only (toast); no DB table or notifications wiring.
- **Edit / delete listing** — Not built.
- **Image optimization** — Raw `<img>` URLs (Supabase public URLs); no Next `Image` remotePatterns bundle.
- **Feed sort options** — Only `created_at` desc.
- **Dating filter** — Only under “All”; add a sixth chip if product wants dating isolated.

See inline comments in `create-listing-form.tsx` if storage upload fails before migration is applied.
