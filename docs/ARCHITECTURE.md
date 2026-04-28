# Architecture overview

This document explains **how the app is structured** so you can navigate the codebase without reading every file. It complements feature-specific docs ([MARKETPLACE.md](./MARKETPLACE.md), [RECEIPT_RATING_SYSTEM.md](./RECEIPT_RATING_SYSTEM.md)) and setup ([GETTING_STARTED.md](./GETTING_STARTED.md)).

---

## High-level diagram (logical)

```
Browser (React Client Components)
    ↓ fetch / forms
Next.js App Router
    ├─ Server Components (RSC) → createClient() from @/lib/supabase/server
    ├─ Server Actions ("use server" in app/actions/*)
    └─ Route Handlers (app/api/*/route.ts) → cookies session + Stripe / admin client
           ↓
Supabase Postgres (RLS) + Auth + Storage + Realtime
           ↓ optional
Stripe API + Webhooks    Supabase Edge Functions (Deno) + Twilio
```

---

## Next.js App Router

- **`app/layout.tsx`** — Root layout: fonts, metadata, providers, `Toaster`.
- **Route groups** — Layouts under `app/*/layout.tsx` wrap segments. Many authenticated areas use **`AppChrome`** (`components/layout/app-chrome.tsx`), which renders **`Navbar`** (with `NotificationBell`) and then `children`.
- **Marketing vs app shell** — The landing page (`app/page.tsx`) uses **`SiteHeader`** from `components/landing/` instead of `AppChrome`; once users hit `/feed`, `/settings`, etc., they get the shared navbar.

**Middleware** (`middleware.ts` + `lib/supabase/middleware.ts`): refreshes the Supabase session cookie on each request. It does **not** enforce auth on specific routes; pages and RLS handle access.

---

## Data access patterns

### Browser Supabase client

- **`lib/supabase/client.ts`** — `createClient()` for Client Components (e.g. listing form uploads, toasts after actions).

### Server Supabase client

- **`lib/supabase/server.ts`** — `createClient()` for Server Components and Server Actions; uses cookies via `@supabase/ssr`.

### Service role (bypass RLS)

- **`lib/supabase/admin.ts`** — `createServiceClient()` using `SUPABASE_SERVICE_ROLE_KEY`. Used only on the server (Stripe webhook, account delete). **Never** expose this key to the client.

---

## Server Actions vs API routes

| Mechanism | Typical use in this repo |
|-----------|---------------------------|
| **Server Actions** (`app/actions/*.ts`) | `createListing`, `submitRatingSide`, notification reads/mutations, settings updates — same-origin POST from forms or `useTransition`. |
| **Route Handlers** (`app/api/*`) | Stripe webhooks (raw body + signature), JSON APIs consumed by `fetch` (Stripe checkout URLs, contacts sync, account delete). |

---

## Supabase schema (conceptual)

- **`profiles`** — Public profile + prefs + Stripe subscription fields (after monetization migration). FK from `listings.user_id`, `ratings` participants, etc.
- **`listings`** — Marketplace posts; `images` JSON array of URLs; `boost_expires_at` for feed ordering.
- **`ratings`** — Mutual double-blind rows; triggers for notifications and score calculation (see migrations + rating doc).
- **`notifications`** — In-app feed; inserts from triggers / server; RLS for read own; Realtime publication for live bell.
- **`contacts`** — Phone-hash matching from Edge `contact-matching`.

**RLS** is enabled on user-facing tables. Anonymous read policies exist where migrations added them (e.g. public profile read migration); **confirm** your security model matches what you ship (public feed vs login-only).

---

## Auth

- **Email/password** via Supabase Auth (`login-form`, `signup-form`).
- **`safeNextPath`** (`lib/navigation.ts`) sanitizes `?next=` after login.

**Gap:** no automatic `profiles` row on signup — see [GETTING_STARTED.md §7](./GETTING_STARTED.md).

---

## Payments (Stripe)

- **Checkout sessions** created in `app/api/stripe/checkout/route.ts` (subscription) and `app/api/stripe/boost/route.ts` (payment or free premium monthly allocation).
- **Webhook** `app/api/stripe/webhook/route.ts` syncs `profiles` subscription fields and applies paid boosts to `listings.boost_expires_at`.

Business rules for “premium” and boost windows live in **`lib/subscription.ts`** (and are mirrored in UI).

---

## Notifications

- **Persistence:** Postgres `notifications` + triggers on `ratings` (see migrations).
- **UI:** `NotificationBell` subscribes to Realtime `postgres_changes` on `notifications` for the signed-in user, plus polling fallback.
- **Copy / links:** `lib/notification-presentation.ts` maps `type` + `metadata` to labels and `href`.

---

## Edge Functions (Supabase)

Deno functions under `supabase/functions/`: Twilio SMS, `contact-matching`, stub `notify-rating`. Deployed separately from Next; secrets live in Supabase Dashboard, not in Next `.env.local`.

---

## Types

**`types/database.ts`** is maintained to match migrations but is **not** auto-generated in CI. After schema changes, regenerate or edit carefully to avoid drift.

---

## Styling and UI

- **Tailwind** + **`tailwindcss-animate`**
- **Radix** primitives (dialog, avatar, toast, label, slot) wrapped in `components/ui/*`
- **Lucide** icons

---

## What this architecture deliberately does not include

- **No global state manager** (Redux/Zustand) — server data + React state + revalidation.
- **No API versioning layer** — Next routes are the API surface.
- **No in-repo E2E test harness** — see [CODEBASE_HANDOFF.md](./CODEBASE_HANDOFF.md) for CI recommendations.

---

## File compass

| Want to change… | Start here |
|-----------------|--------------|
| Navbar / shell | `components/layout/navbar.tsx`, `app-chrome.tsx` |
| Feed ordering | `lib/feed-sort.ts`, `app/feed/page.tsx` |
| Listing create / limits | `app/actions/listings.ts`, `components/listings/create-listing-form.tsx` |
| Rating submit | `app/actions/ratings.ts`, `components/ratings/rate-wizard.tsx` |
| Profile page | `app/profile/[username]/page.tsx`, `components/profile/*` |
| Notifications list | `app/notifications/*`, `app/actions/notifications.ts` |
| Stripe | `app/api/stripe/*`, `lib/stripe-server.ts` |
| Env guards | `lib/env.ts` |
