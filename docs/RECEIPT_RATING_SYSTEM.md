# Double-blind rating system — implementation status

> **Environment & repo setup:** [GETTING_STARTED.md](./GETTING_STARTED.md) · **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)

This document tracks **what is implemented** vs **what you still need to do** (run migrations, deploy edge functions, product polish).  
**Nothing here was executed or tested in CI** — apply SQL in Supabase and run the app locally.

---

## Done in application code

| Area | Status |
|------|--------|
| **Wizard** `/app/rate/[userId]/page.tsx` | **Done** — Loads counterparty profile + open rating row between you and them; redirects unauthenticated users to login with `next=`; `notFound` if profile missing. |
| **Client wizard** `components/ratings/rate-wizard.tsx` | **Done** — Rater: 4 steps (relationship → 5× sliders 1–10 with dimension copy → optional review ≤280 chars → double-blind confirmation). Rated party: 3 steps (sliders → review → confirm). Submit calls server action. |
| **Server action** `app/actions/ratings.ts` | **Done** — `submitRatingSide`: finds pair row, writes `rater_score_data` or `rated_score_data`, sets submission flags, merges public `scores` + `review_text` from **rater’s** dimensions when both sides complete, revalidates profile + pending + rate routes, **best-effort** POST to Edge `notify-rating` with the user’s JWT. |
| **Payload helpers** `lib/rating-dimensions.ts` | **Done** — JSON shape for `rater_score_data` / `rated_score_data`, public `scores` extraction, review cap. |
| **Pending list** `/app/ratings/pending/page.tsx` | **Done** — Lists incomplete mutual ratings for the signed-in user; resolves counterparty usernames; links to `/rate/[counterpartyId]`. |
| **Pending card** `components/ratings/PendingRatingCard.tsx` | **Done** — Lock visual, initiated-by copy, CTA or “waiting on them”. |
| **Unlock card** `components/ratings/RatingUnlockCard.tsx` | **Done** — Staggered reveal animation (CSS + timeout); “You vs them” per dimension with delta. |
| **Profile integration** | **Done** — `ProfileRatingsFeed` shows `RatingUnlockCard` for **participants** on completed rows; **owner-only** `ProfileOwnerPending` lists open receipts. |
| **Start flow** `rate-person-dialog.tsx` | **Done** — After creating the row, navigates to `/rate/[ratedUserId]` to finish the wizard. |
| **Login redirect** | **Done** — Rate page uses `?next=/rate/...` for anonymous visitors. |

---

## Done in database migration (must run in Supabase)

**File:** `supabase/migrations/20260429000000_rating_system.sql`

| Piece | Status |
|-------|--------|
| **Unique pair** `(rater_id, rated_id)` | **Done** in SQL — prevents duplicate rows for the same directed pair. |
| **`avg_dimension_scores(jsonb)`** | **Done** — averages numeric 1–10 keys present in `scores`. |
| **`calculate_profile_scores(profile_id)`** | **Done** — Recomputes `profiles.overall_score` (mean of per-rating dimension averages from `scores`) and `total_ratings` for rows where `rated_id = profile_id` and `both_submitted`. |
| **Trigger `ratings_on_unlock_recalc`** | **Done** — After `both_submitted` becomes true: calls `calculate_profile_scores(rated_id)` and enqueues **two** `rating_unlocked` notifications (rater + rated) via `SECURITY DEFINER` helper. |
| **Trigger `ratings_partial_submit_notify`** | **Done** — After first-side submit: notifies the other party (`new_rating` type) while still blind. |

### NOT run automatically

- You must **apply this migration** in the Supabase SQL editor or via CLI (`supabase db push`). Until then, triggers and `calculate_profile_scores` **do not exist** in your project.

---

## Edge function `notify-rating`

| Item | Status |
|------|--------|
| **Stub** `supabase/functions/notify-rating/index.ts` | **Done** — CORS + POST body echo; safe no-op. |
| **Deploy** | **NOT done** — Run `supabase functions deploy notify-rating` from your machine. |
| **JWT verification / real delivery** | **NOT done** — Add verify + service role client if you want email/push **in addition to** DB notifications (avoid double inserts if you mirror DB trigger logic). |

The Next server action **calls** this function after each successful submit; **404 is expected** until deployed — errors are swallowed by design.

---

## Product / data rules (implemented behavior)

- **Public `scores` on unlock** = dimension values from **`rater_score_data`** only (how the initiator rated the profile subject). **`review_text`** on the row = rater’s optional review for the anonymous public feed on the **rated** person’s profile.
- **`rated_score_data`** is used for the **unlock card delta** (“you vs them”) and is **not** folded into `profiles.overall_score` in this version (only `rated_id` + `scores` feed the aggregate). Extending `calculate_profile_scores` to also update the **rater’s** profile from reverse perspective is **NOT done**.

---

## Known gaps / follow-ups (NOT implemented)

- **No automated `profiles` row on signup** — rating FK still requires both users to exist in `profiles`.
- **No edit / withdraw** after submit — only forward flow.
- **No duplicate-pair UX** — unique index will error on second insert; UI could map unique violation to a friendly message.
- **No listing of “ratings I gave”** on someone else’s profile beyond unlock UX — only completed-as-`rated_id` feed on profile page.
- **Edge + DB double-notification** — if you later make the Edge function insert notifications, **disable or slim** the SQL `enqueue_rating_notification` triggers to avoid duplicates.

---

## Files touched (quick index)

- `app/rate/[userId]/page.tsx`
- `app/ratings/pending/page.tsx`
- `app/actions/ratings.ts`
- `components/ratings/rate-wizard.tsx`
- `components/ratings/RatingUnlockCard.tsx`
- `components/ratings/PendingRatingCard.tsx`
- `components/profile/profile-ratings-feed.tsx`
- `components/profile/profile-owner-pending.tsx`
- `components/profile/rate-person-dialog.tsx`
- `app/profile/[username]/page.tsx`
- `lib/rating-dimensions.ts`
- `supabase/migrations/20260429000000_rating_system.sql`
- `supabase/functions/notify-rating/index.ts`
- This doc: `docs/RECEIPT_RATING_SYSTEM.md`
