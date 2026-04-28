# The Receipt — codebase handoff & wrap-up checklist

This document is a **single-source handoff** for continuing work in Cursor, Claude Code, or any other agent. It summarizes **architecture**, **what exists**, **what you must run/configure**, **what was deliberately omitted or left incomplete**, and **known inconsistencies** discovered by a full-repo scan (not by running CI or production deploys — **assume `npm install`, migrations, and Supabase/Stripe dashboards are your responsibility**).

---

## 1. Product & stack (context)

**The Receipt** is a Next.js **14.2** (App Router) + **TypeScript** + **Tailwind** + **shadcn-style UI** app with **Supabase** (Postgres, Auth, Storage, Realtime, Edge Functions) and optional **Stripe** (subscriptions + one-time boosts) and **Twilio** (SMS via Edge Functions + DB webhooks).

**Core product ideas in code:**

- **Marketplace** — Listings with categories, poster profile + Receipt score on cards (`/feed`, `/listings/*`).
- **Double-blind mutual ratings** — `ratings` rows, wizard at `/rate/[userId]`, pending at `/ratings/pending`, profile feed of unlocked ratings.
- **Notifications** — DB-backed `notifications` table + triggers; in-app UI + Realtime bell; optional SMS Edge functions.
- **Contacts sync** — Edge `contact-matching` + Next `POST /api/contacts/sync` for address-book matching.
- **Monetization** — Stripe Checkout for **Receipt Premium** (~$9.99/mo) and **listing boost** (~$3.99 / 48h); free tier **2 active listings** enforced in `createListing` server action.
- **Settings** — Profile, SMS prefs, privacy (`who_can_rate`, `score_public`), account email/password, optional account delete (service role).

---

## 2. Repository map (high level)

| Path | Role |
|------|------|
| `app/` | Routes: marketing `/`, auth `/login` `/signup`, feed, listings, profile `[username]`, rate, ratings pending, notifications, messages (placeholder), settings, premium, API routes under `app/api/` |
| `components/` | UI: layout (`AppChrome`, `Navbar`, `NotificationBell`), listings, profile, ratings, auth, landing |
| `app/actions/` | Server actions: `listings`, `ratings`, `notifications`, `settings` |
| `lib/` | Supabase clients, stripe helpers, subscription helpers, notification copy, feed sort, scores, env |
| `types/database.ts` | **Hand-maintained** Supabase-aligned types (drift vs real DB is possible) |
| `supabase/migrations/` | Ordered SQL migrations (must all be applied in Supabase) |
| `supabase/functions/` | Deno Edge: Twilio SMS, contact matching, stub `notify-rating` |
| `docs/` | **Index:** `docs/README.md`. **Setup & structure:** `GETTING_STARTED.md`, `ARCHITECTURE.md`. **This file** + `MARKETPLACE.md`, `RECEIPT_RATING_SYSTEM.md`, `SMS_AND_WEBHOOKS.md` |

**Root `README.md`** points contributors to `docs/` (install, migrations, env). **`.env.local.example`** remains the canonical variable list with inline comments.

---

## 3. Migrations — apply in order (must-do)

Run via Supabase CLI (`supabase db push`) or paste in SQL editor **in chronological order**:

| File | What it does |
|------|----------------|
| `20260428120000_initial_schema.sql` | Core tables: `profiles`, `listings`, `ratings`, `notifications`, `contacts`, RLS, enums |
| `20260428140000_public_profile_read.sql` | Anon read policy on `profiles` (if still desired for your security model) |
| `20260429000000_rating_system.sql` | Rating uniqueness, `calculate_profile_scores`, triggers for unlock + partial notifications |
| `20260429120000_listing_images_storage.sql` | Storage bucket `listing-images` + policies |
| `20260429180000_notifications_settings_realtime.sql` | Profile SMS/privacy columns, realtime publication for `notifications`, richer notification metadata in triggers |
| `20260429200000_can_initiate_rating_rpc.sql` | `can_initiate_rating` RPC for **contacts-only** rating gate (RLS-safe) |
| `20260430120000_stripe_monetization.sql` | Stripe columns on `profiles`, `boost_expires_at` on `listings`, `profile_views` + `touch_profile_view` |

**If any migration is skipped:** app features that depend on it will fail at runtime (RPC missing, column missing, Realtime not updating, etc.).

---

## 4. Environment variables (matrix)

### Next.js (`.env.local` / Vercel)

| Variable | Used for |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server Supabase |
| `NEXT_PUBLIC_APP_URL` | Stripe Checkout `success_url` / `cancel_url` base; should match production origin (no trailing slash) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** — Stripe webhook (`lib/supabase/admin.ts`), account delete API |
| `STRIPE_SECRET_KEY` | Checkout session creation, webhook verification partner |
| `STRIPE_WEBHOOK_SECRET` | `POST /api/stripe/webhook` |
| `STRIPE_PRICE_PREMIUM_MONTHLY` | Subscription price id |
| `STRIPE_PRICE_LISTING_BOOST` | One-time boost price id |

### Supabase Edge Function secrets (Dashboard)

Documented in `docs/SMS_AND_WEBHOOKS.md`: Twilio vars, `NEXT_PUBLIC_APP_URL`, optional `WEBHOOK_SECRET`, `SEND_RATING_INAPP`, plus auto-injected `SUPABASE_*`.

### Omissions

- **No `.env` validation at startup** beyond ad-hoc checks (e.g. Stripe throws when creating checkout if keys missing).
- **`isSupabaseConfigured()`** (`lib/env.ts`) only checks URL + anon key — not Stripe/Twilio.
- **Env table for humans** lives in `docs/GETTING_STARTED.md` §3 and `.env.local.example`; keep them in sync when adding variables.

---

## 5. API routes (Next)

| Route | Auth | Purpose |
|-------|------|---------|
| `POST /api/stripe/checkout` | Session | Create Stripe subscription Checkout |
| `POST /api/stripe/boost` | Session | Paid boost Checkout OR `usePremiumAllocation: true` for monthly free boost |
| `POST /api/stripe/webhook` | Stripe signature | Sync subscription + apply boost after payment |
| `POST /api/account/delete` | Session + confirm username | Deletes auth user via Admin API (501 if no service role) |
| `POST /api/contacts/sync` | Session | Proxies to Edge `contact-matching` |

**Omissions:**

- **No Stripe Customer Portal** route — users cannot self-serve cancel/update card from the app; they use Stripe Dashboard or you add `/api/stripe/portal`.
- **No webhook idempotency store** — duplicate `checkout.session.completed` could theoretically double-apply boost (low probability).
- **No request logging / monitoring** hooks.

---

## 6. Supabase Edge Functions

| Function | Purpose | Deploy |
|----------|---------|--------|
| `send-rating-notification` | SMS on new rating (Twilio); optional in-app insert if `SEND_RATING_INAPP=true` | `supabase functions deploy …` |
| `send-unlock-notification` | SMS when `both_submitted` | same |
| `contact-matching` | Match phones to profiles, upsert `contacts` | same |
| `notify-rating` | **Stub** — called from `app/actions/ratings.ts`; no real delivery | same |

**Omissions (by design in code/comments):**

- **`notify-rating`**: No JWT hardening, no email/push — placeholder only (`docs/RECEIPT_RATING_SYSTEM.md`).
- **SMS vs DB notifications:** Edge `send-rating-notification` can duplicate SQL trigger notifications if both insert in-app rows — env `SEND_RATING_INAPP` defaults off for that reason.
- **DB webhooks** for SMS are **not** created by migrations — you must configure them in Supabase Dashboard (documented in `SMS_AND_WEBHOOKS.md`).

---

## 7. Auth & onboarding (gaps)

**Signup** (`components/auth/signup-form.tsx`): email/password via Supabase Auth only. Optional **phone** field for invite UX — **not** written to `profiles.phone_number` automatically.

**Critical gap (documented in `RECEIPT_RATING_SYSTEM.md`):**

- **There is no automated `profiles` row creation on signup** in this repo. Ratings FK require both users to exist in `profiles`. You need either: a Supabase **Auth trigger** + function to insert `profiles`, or an onboarding flow that inserts the row after signup.

**Login** uses `safeNextPath` (`lib/navigation.ts`) for `?next=` — good for open-redirect safety.

**Middleware** (`middleware.ts` + `lib/supabase/middleware.ts`): **session refresh only** — no route protection. Unauthenticated users can hit routes that then redirect in page code or fail RLS.

---

## 8. Marketplace & listings

**Implemented:** feed with category filter, sort **boosted first** then `created_at` (`lib/feed-sort.ts`), listing detail, create flow with images to `listing-images`, server action validation, **free tier 2 active listings** in `app/actions/listings.ts` (premium: `subscription_status` `active` or `trialing`).

**Omissions / follow-ups (from `docs/MARKETPLACE.md` + scan):**

- **Listing inquiry** — `ListingInquireButton` is **toast-only demo**; no DB, no `listing_inquiry` notifications pipeline.
- **Edit / delete listing** — not built.
- **Image optimization** — raw `<img>` / storage URLs; no `next/image` `remotePatterns` config.
- **Feed sort options** — beyond boost+recency, no price/distance/relevance.
- **Dating chip** — dating only under “All”, not isolated chip (product choice).
- **Reactivating listings** — if you add “closed → active” without server checks, user could exceed free cap (only **insert** path is guarded today).

---

## 9. Ratings & profiles

**Implemented:** rate wizard, pending list, profile ratings feed, owner pending block, `can_initiate_rating` for `contacts_only`, partial/unlock SQL notifications, optional initiator reveal for **premium** rated party (`PendingRatingCard`, `RateWizard`), dimension aggregates, optional **private score** UI for visitors when `score_public` is false.

**Omissions:**

- **No withdraw/edit** after submit.
- **Duplicate pair UX** — unique index errors not mapped to friendly copy in `rate-person-dialog`.
- **`rated_score_data` not in `profiles.overall_score`** — only rater’s public dimensions feed aggregate (see `RECEIPT_RATING_SYSTEM.md`).
- **`score_public` / `who_can_rate`** — enforced in **UI + some client flows + `createListing` listing count**; not a full server-side “hide columns from API” layer (authenticated users might still receive raw profile JSON elsewhere if you add APIs).
- **Premium “detailed breakdown”** — extra copy around existing `ProfileDimensionBars`; true analytics depth is limited by data model.

---

## 10. Notifications & activity

**Implemented:** `/notifications` page, mark read / mark all, `NotificationBell` with Realtime + 30s refetch, copy/hrefs in `lib/notification-presentation.ts`, layouts with `AppChrome`.

**Omissions / issues:**

- **`/ratings/pending` and `/rate/[userId]`** — **Fixed (second pass):** removed duplicate full-width header strips; pages rely on `AppChrome` → `Navbar` plus an in-content back link on the rate flow.
- **`new_message` / `listing_inquiry` notification types** exist in types + presentation, but **no producers** insert those rows (inquiry is demo-only).

---

## 11. SMS (Twilio) & growth

**Implemented:** Edge functions + shared Twilio client + phone utils; Next route `POST /api/contacts/sync`; signup `?phone=` prefill.

**Must-do externally:** Deploy functions, set secrets, configure **Database Webhooks** on `ratings` (insert + update) per `docs/SMS_AND_WEBHOOKS.md`.

**Omissions:**

- **No end-to-end test** in repo against Twilio sandbox.
- **Contact-matching** matched profiles select does not include `subscription_status` (only relevant if you reuse that payload for listing cards — currently not).

---

## 12. Stripe & monetization

**Implemented:**

- Premium page `/premium`, checkout for subscription, boost checkout + free monthly boost branch, webhook for subscription lifecycle + boost payment, `profiles` + `listings` columns, `PremiumBadge`, feed/listing card boost styling, listing limit for free users.

**Omissions:**

- **No in-app subscription management** (cancel, update payment method) — add Stripe Billing Portal or custom flows.
- **Webhook coverage** is minimal set documented in `SMS_AND_WEBHOOKS.md` — e.g. no `customer.updated`, no `invoice.paid` refresh (usually `subscription.updated` suffices).
- **`checkout.session.completed` (subscription)** — **Hardened:** profile update runs only when `payment_status` is `paid` or `no_payment_required`; unpaid/async flows rely on later `customer.subscription.*` events.
- **Free monthly boost** (`POST /api/stripe/boost` with `usePremiumAllocation`): listing `boost_expires_at` updates before `premium_boost_month_used`; if the second update fails, user could have a boost without the month flag set — rare; consider a single Postgres RPC transaction.
- **Types:** `types/database.ts` is **manual** — regenerate with Supabase CLI after schema changes to avoid drift.

---

## 13. Settings & account

**Implemented:** consolidated `/settings` (profile, SMS toggles, privacy, email/password, delete account dialog).

**Omissions:**

- **Signup phone** not synced to profile phone (SMS growth story incomplete without that step).
- **Account delete** returns 501 without service role — by design; document for ops.
- **Email change** depends on Supabase project email confirmation settings.

---

## 14. Messages

`/messages` is a **placeholder** (“coming soon”) with auth redirect — ties to `new_message` notification href only.

---

## 15. Testing, CI, quality

**Scan results:**

- **No automated tests** (no Jest/Vitest/Playwright in `package.json`).
- **No CI workflow files** in repo (no `.github/workflows` found).
- **Lint:** `npm run lint` exists; **not verified in this handoff environment** (npm was unavailable in agent shell earlier).

**Recommended wrap-up:**

1. Add `npm test` + minimal smoke tests (auth redirect, webhook signature rejection, `createListing` limit).
2. Add GitHub Action: `npm ci`, `npm run lint`, `npm run build`.
3. Run `npx supabase gen types typescript` and reconcile `types/database.ts`.

---

## 16. Security & privacy notes (for Claude)

- **Service role** must never reach the browser — only server routes / Edge with secrets.
- **RLS:** default policies on `profiles`, `listings`, `ratings`, etc. — review if you expose **anon** read to listings; current feed uses authenticated server client patterns in places — **verify** each route’s `createClient()` expectations vs your product (public marketplace vs login-only).
- **`touch_profile_view`:** `SECURITY DEFINER` — keep search_path pinned (already in migration) and audit who can call.
- **`can_initiate_rating`:** same.
- **Stripe webhooks:** raw body + signature only; no CSRF concern.

---

## 17. UX / UI consistency backlog

| Issue | Status / suggestion |
|-------|---------------------|
| Duplicate nav on `/ratings/pending` | **Done** — inner strip removed |
| `/rate/[userId]` duplicate top bar | **Done** — back link in content only |
| Landing `SiteHeader` vs in-app `Navbar` | Intentional split; documented in `ARCHITECTURE.md` |
| Root README | **Done** — `README.md` + `docs/README.md` index |

---

## 18. Dependency versions (pin awareness)

- `next@14.2.18`, `react@18`, `stripe@^17.7.0` (run `npm install`).
- Radix: dialog, avatar, toast, label, slot — **no** dropdown-menu package (menus implemented with Dialog + custom click-outside).

---

## 19. Suggested order of work for “wrap up cleanly”

Use this as a punch list for Claude Code:

1. **Apply all migrations** to target Supabase project; fix any migration ordering conflicts.
2. **`npm install` + `npm run build` + `npm run lint`** — fix all errors.
3. **Regenerate `types/database.ts`** from Supabase; fix TypeScript fallout.
4. **Auth onboarding:** implement `profiles` insert on signup (trigger or server flow) + optionally sync signup phone to `profiles.phone_number`.
5. **Stripe:** create Products/Prices; set env; register webhook URL; test subscription + boost + webhook idempotency mentally; add **Customer Portal** if required.
6. **Twilio + DB webhooks:** deploy Edge functions; set secrets; wire DB webhooks; test SMS copy links with real `NEXT_PUBLIC_APP_URL`.
7. **Listing inquiry:** DB table + notification insert + real messaging or remove misleading CTA.
8. **CONTRIBUTING.md** (optional) — conventions + PR checklist; env table already in `GETTING_STARTED.md`.
9. **CI + smoke tests.**

---

## 20. File index (quick grep targets)

- **Stripe:** `app/api/stripe/*`, `lib/stripe-server.ts`, `lib/subscription.ts`, `lib/supabase/admin.ts`, `app/premium/*`, `components/listings/BoostButton.tsx`
- **Notifications:** `app/notifications/*`, `components/layout/notification-bell.tsx`, `app/actions/notifications.ts`, `lib/notification-presentation.ts`
- **SMS Edge:** `supabase/functions/send-*`, `send-unlock-notification`, `_shared/twilio.ts`
- **Contacts:** `supabase/functions/contact-matching`, `app/api/contacts/sync/route.ts`
- **Ratings:** `app/actions/ratings.ts`, `app/rate/*`, `components/ratings/*`, `supabase/migrations/20260429000000_rating_system.sql`
- **Settings:** `app/settings/*`, `app/actions/settings.ts`
- **Layout:** `components/layout/navbar.tsx`, `app-chrome.tsx`

---

## 21. Second-pass code review (consistency & small fixes)

Items verified or changed in a follow-up scan (still run `npm run lint` / `npm run build` locally):

| Area | Finding |
|------|---------|
| Layout | Removed redundant “second navbar” strips from `app/ratings/pending/page.tsx` and `app/rate/[userId]/page.tsx` so `AppChrome` / `Navbar` is the single chrome. |
| Stripe | `checkout.session.completed` subscription handling now gates on `payment_status` (`paid` \| `no_payment_required`) before writing subscription fields to `profiles`. |
| Docs | Added `docs/GETTING_STARTED.md`, `docs/ARCHITECTURE.md`, `docs/README.md`, root `README.md` so setup is not only in SMS/marketplace/rating docs. |
| Boost API | Documented rare two-step update ordering risk (`listings` then `profiles`) in §12 above. |
| ESLint | `no-img-element` suppressions remain intentional until `next/image` + `remotePatterns` are configured. |

---

*End of handoff document. Update this file whenever you ship a milestone so the next agent inherits accurate intent.*
