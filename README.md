# The Receipt

Next.js 14 marketplace + mutual “Receipt” ratings backed by **Supabase** (Postgres, Auth, Storage, Realtime). Optional **Stripe** (premium subscription + listing boosts) and **Twilio** SMS via Supabase Edge Functions.

## Documentation

All detailed docs live in **`docs/`**. Start here:

1. **[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)** — Clone, `npm install`, environment variables, migrations, Auth URLs, first-run pitfalls (including the **`profiles` row** requirement).
2. **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — System layout and where to change behavior.
3. **[docs/README.md](docs/README.md)** — Full index of every doc file.

Environment template: **`.env.local.example`**.

## Scripts

```bash
npm install
npm run dev    # http://localhost:3000
npm run lint
npm run build
```

## License

Private project (`"private": true` in `package.json`). Adjust as needed for your org.
