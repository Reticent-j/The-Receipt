# SMS (Twilio) and Supabase Edge Functions

> **First-time setup (clone, env, migrations):** [GETTING_STARTED.md](./GETTING_STARTED.md) · **All docs:** [README.md](./README.md)

## Secrets (Supabase Dashboard → Project Settings → Edge Functions → Secrets)

Set the same names the Edge code reads:

| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | Injected automatically in hosted Edge |
| `SUPABASE_SERVICE_ROLE_KEY` | Injected automatically |
| `SUPABASE_ANON_KEY` | Required for `contact-matching` JWT validation |
| `TWILIO_ACCOUNT_SID` | Twilio REST |
| `TWILIO_AUTH_TOKEN` | Twilio REST |
| `TWILIO_PHONE_NUMBER` | E.164 sender |
| `NEXT_PUBLIC_APP_URL` | Public site base URL for links in SMS (no trailing slash) |
| `WEBHOOK_SECRET` | Optional; if set, DB webhooks must send header `x-webhook-secret` |
| `SEND_RATING_INAPP` | Optional; set to `true` to insert an in-app notification when the rated user has a profile phone (Postgres may already enqueue `new_rating` — avoid duplicates). |

Deploy functions from the repo root:

```bash
supabase functions deploy send-rating-notification
supabase functions deploy send-unlock-notification
supabase functions deploy contact-matching
```

## Database webhooks (Dashboard → Database → Webhooks)

1. **`send-rating-notification`** — Table `public.ratings`, event **INSERT**. URL: `https://<project-ref>.supabase.co/functions/v1/send-rating-notification`. Add header `x-webhook-secret` if you configured `WEBHOOK_SECRET`.

2. **`send-unlock-notification`** — Table `public.ratings`, event **UPDATE**. Prefer a webhook filter so the hook runs when `both_submitted` becomes true (if your plan supports column filters). URL: `.../functions/v1/send-unlock-notification`.

## Next.js: contact sync

`POST /api/contacts/sync` with JSON `{ "contacts": [{ "phone": "+1...", "name": "..." }] }` and a logged-in session. The route forwards the user JWT to `contact-matching`.

## Stripe (Next.js server routes)

Set in **Vercel / `.env.local`** (server only except `NEXT_PUBLIC_APP_URL`):

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Signing secret from Stripe Dashboard → Webhooks |
| `STRIPE_PRICE_PREMIUM_MONTHLY` | Price ID for $9.99/mo subscription |
| `STRIPE_PRICE_LISTING_BOOST` | Price ID for $3.99 one-time boost |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhook updates `profiles` / `listings` |
| `NEXT_PUBLIC_APP_URL` | Checkout `success_url` / `cancel_url` base |

**Stripe Dashboard → Developers → Webhooks:** endpoint `https://<your-domain>/api/stripe/webhook`, events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

**Implementation note:** For `checkout.session.completed` in **subscription** mode, the app updates `profiles` only when `payment_status` is `paid` or `no_payment_required`. Unpaid or deferred payment sessions skip the immediate write so `customer.subscription.*` events remain the source of truth.
