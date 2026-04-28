# Getting started — local environment & first deploy

Follow these steps **in order** the first time you clone the repo. Later you can jump to [Quick dev loop](#quick-dev-loop).

For deeper system design after the app runs, read [ARCHITECTURE.md](./ARCHITECTURE.md). For handoff and known gaps, see [CODEBASE_HANDOFF.md](./CODEBASE_HANDOFF.md).

---

## Prerequisites

- **Node.js 20 LTS** (or 18+) and **npm** on your PATH.
- A **Supabase** account and a new (or existing) project.
- Optional: **Stripe** account (subscriptions + boosts), **Twilio** (SMS — see [SMS_AND_WEBHOOKS.md](./SMS_AND_WEBHOOKS.md)).

---

## Step 1 — Clone and install

```bash
git clone <repository-url>
cd "The Receipt"
npm install
```

Verify:

```bash
npm run lint
npm run build
```

Fix any TypeScript or ESLint errors before continuing.

---

## Step 2 — Create the Supabase project

1. In [Supabase Dashboard](https://supabase.com/dashboard), create a project (note the **region**).
2. Open **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Open **Project Settings → API → service_role** (secret) → `SUPABASE_SERVICE_ROLE_KEY`  
   Use **only** in server-side Next.js env (never `NEXT_PUBLIC_`). Required for:
   - `POST /api/stripe/webhook`
   - `POST /api/account/delete` (otherwise the route returns 501)

---

## Step 3 — Environment file (Next.js)

Copy the example file and fill values:

```bash
cp .env.local.example .env.local
```

| Variable | Required for | Notes |
|----------|----------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Core app | From Supabase API settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Core app | Public anon key |
| `NEXT_PUBLIC_APP_URL` | Stripe return URLs, SMS links | No trailing slash, e.g. `http://localhost:3000` |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhooks, account delete | Server only |
| `STRIPE_SECRET_KEY` | Premium + boost checkout | Server only |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification | From Stripe CLI or Dashboard webhook |
| `STRIPE_PRICE_PREMIUM_MONTHLY` | Subscription Checkout | Stripe Price id (`price_...`) |
| `STRIPE_PRICE_LISTING_BOOST` | Paid boost Checkout | Stripe Price id |

Stripe and service role can be omitted until you test those features; the rest of the app should load with Supabase alone (subject to RLS and data).

---

## Step 4 — Run database migrations

SQL lives in `supabase/migrations/`. Apply **every file in timestamp order** to your Supabase database.

**Option A — Supabase CLI** (recommended if you use local Supabase or linked remote):

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**Option B — SQL Editor** in the Dashboard: open each migration file in order (see [CODEBASE_HANDOFF.md §3](./CODEBASE_HANDOFF.md)) and execute.

Skipping a migration causes missing tables, columns, RLS policies, or RPCs — failures are usually obvious in the browser or server logs.

---

## Step 5 — Supabase Auth URLs

In **Authentication → URL Configuration**:

- **Site URL**: match `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000` for local dev).
- **Redirect URLs**: add the same origin plus any preview URLs you use (e.g. Vercel `https://*.vercel.app` if needed).

Without this, magic links and OAuth redirects can fail or land on the wrong host.

---

## Step 6 — Storage (listing images)

Migration `20260429120000_listing_images_storage.sql` creates the **`listing-images`** bucket and policies. If you applied migrations, uploads from **New listing** should work.

If uploads fail with “bucket not found”, re-run that migration or create the bucket manually with the same name and align policies with the migration file.

---

## Step 7 — First user and `profiles` row (critical)

`public.profiles.id` references `auth.users`. The app expects a **profile row** for each user who posts listings, rates, or appears in the marketplace.

**This repository does not automatically insert `profiles` on signup.** After you create an account:

- Either insert a row manually in SQL for testing, **or**
- Add a Supabase **Database Trigger** on `auth.users` (after insert) to create `profiles` (recommended for production), **or**
- Build an onboarding step that inserts/updates `profiles` after first login.

Until a profile exists, flows that join on `profiles` (navbar, checkout, ratings) may error or return “Profile not found”. See [RECEIPT_RATING_SYSTEM.md](./RECEIPT_RATING_SYSTEM.md) for related rating constraints.

---

## Step 8 — Run the dev server

```bash
npm run dev
```

Open `http://localhost:3000`. Sign up, ensure profile exists, then try **Feed** and **New listing**.

---

## Step 9 — Stripe (optional but needed for monetization)

1. In Stripe Dashboard, create **Products/Prices** for monthly subscription and one-time boost (amounts are product decisions; code uses Price ids from env).
2. Add the price ids to `.env.local` as documented in Step 3.
3. For local webhook testing:

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

   Put the signing secret in `STRIPE_WEBHOOK_SECRET`.

4. In production, register `https://<your-domain>/api/stripe/webhook` in Stripe **Developers → Webhooks** and use the endpoint signing secret.

Event types currently handled are documented in [SMS_AND_WEBHOOKS.md](./SMS_AND_WEBHOOKS.md) (Stripe section). The handler skips updating the profile from subscription Checkout until `payment_status` is `paid` or `no_payment_required` (async payment flows rely on later subscription events).

---

## Step 10 — Edge Functions & Twilio (optional)

Deploy and configure secrets as in [SMS_AND_WEBHOOKS.md](./SMS_AND_WEBHOOKS.md). This is **not** required for core marketplace + ratings in-app notifications (DB triggers + Realtime).

---

## Quick dev loop

After initial setup:

1. `npm run dev`
2. Pull migration changes → re-run `db push` or apply new SQL.
3. Regenerate types when schema changes:  
   `npx supabase gen types typescript --project-id <ref> > types/database.ts`  
   (merge carefully if you hand-edit types.)

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| “Invalid API key” / Supabase errors | Wrong URL or anon key in `.env.local` |
| Image upload errors | Migrations not applied; bucket missing |
| Stripe checkout 500 | Missing `STRIPE_SECRET_KEY` or price env vars |
| Webhook 400 “Missing signature” | Not using raw body (Next route already uses `req.text()` — check Stripe CLI forward URL) |
| Navbar empty / checkout “Profile not found” | No `profiles` row for `auth.users` id |
| Notifications bell never updates | Realtime not enabled for `notifications` (see notifications migration) |
| Premium free boost odd state | Rare race: listing updated but `premium_boost_month_used` failed — check DB and retry; consider a single RPC transaction later |

---

## Where to read next

| Doc | When |
|-----|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | How routes, RLS, and server actions fit together |
| [MARKETPLACE.md](./MARKETPLACE.md) | Listings product scope and omissions |
| [RECEIPT_RATING_SYSTEM.md](./RECEIPT_RATING_SYSTEM.md) | Ratings schema, RPCs, edge cases |
| [SMS_AND_WEBHOOKS.md](./SMS_AND_WEBHOOKS.md) | Twilio, DB webhooks, Stripe webhook env |
| [CODEBASE_HANDOFF.md](./CODEBASE_HANDOFF.md) | Full punch list for another engineer or agent |
