# Golf Golf Golf ⛳

A golf round tracker built to go beyond GolfGenius: course scorecards, live
scoring, skins, closest-to-pin with photo distance measurement, self-tracked
(and GHIN-linkable) handicaps, a social feed of golfers you follow, and a
PGA Tour scores/odds page.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Prisma** ORM against **Postgres** (`prisma/schema.prisma`) — works with
  Vercel Postgres, Neon, Supabase, Railway, or any standard Postgres
- **NextAuth** (credentials/email+password) for auth
- **Tailwind CSS** for styling
- **Vercel Blob** for closest-to-pin photo storage in production (falls
  back to local disk for zero-setup local dev)

## Getting started

You need a Postgres database. The fastest way is a free
[Neon](https://neon.tech) or [Vercel Postgres](https://vercel.com/storage/postgres)
instance — create one and copy its connection string.

```bash
npm install
cp .env.example .env        # set DATABASE_URL and NEXTAUTH_SECRET at minimum
npm run db:push             # applies the schema to your Postgres database
npm run dev
```

Visit `http://localhost:3000`, create an account, add a course, and start a
round.

## Deploying to Vercel

1. Push this repo to GitHub and import it in the Vercel dashboard (or run
   `vercel` from the repo root with the [Vercel CLI](https://vercel.com/docs/cli)).
2. Add a Postgres database: Vercel dashboard → your project → **Storage** →
   **Create Database** → Postgres (or connect an existing Neon/Supabase
   instance). This sets `DATABASE_URL` for you automatically.
3. Add a Blob store for closest-to-pin photos: **Storage** → **Create
   Database** → Blob. This sets `BLOB_READ_WRITE_TOKEN` automatically.
4. Set the remaining env vars from `.env.example` under **Settings** →
   **Environment Variables** — at minimum `NEXTAUTH_SECRET` (a long random
   string) and `NEXTAUTH_URL` (your deployed URL).
5. Deploy. `npm run build` will run `prisma generate` automatically via the
   `postinstall` script; run `npx prisma db push` once (locally, pointed at
   the production `DATABASE_URL`, or via `vercel env pull` first) to create
   the tables.

## Feature map

| Feature | Where | Notes |
|---|---|---|
| Course scorecards | `/courses`, `src/lib/ghin.ts` | Import from GHIN or add manually. GHIN import uses mock sample courses until real GHIN API credentials are configured (see below). |
| Round entry & scoring | `/rounds/new`, `/rounds/[id]` | Hole-by-hole scorecard, live totals, guest players (no account needed). |
| Handicap index | `src/lib/handicap.ts` | Self-computed USGA World Handicap System (score differential, net double bogey cap, low-round-count table). **Not an official/certified handicap** — link a GHIN number for the real thing. |
| Live GHIN handicap pull | `src/lib/ghin.ts`, dashboard | Same GHIN-adapter pattern as courses; mocked until credentials are set. |
| Share round via text | `src/lib/share.ts`, round page "Share via text" button | Uses the Web Share API where available, falls back to an `sms:` deep link with a pre-filled scorecard summary. |
| Skins | `/skins`, `src/lib/skins.ts` | Lowest score-to-par on a hole wins; ties push (carry the skin's value) to the next hole. Computed on "Finalize round". |
| Closest to pin (photo + distance) | `/closest-to-pin`, `src/lib/distance.ts` | Upload a photo, tap the flagstick top/bottom (known ~7ft reference) then the ball and the hole; distance is estimated by pixel scale. Manual entry always available as an override. |
| Social / following | `/social` | Follow other golfers, see their handicap index and a feed of their recent rounds. |
| PGA Tour scores & odds | `/pga-tour`, `src/lib/pga.ts`, `src/lib/odds.ts` | Leaderboard + outright winner odds aggregated across sportsbooks (including FanDuel). Falls back to demo data until a provider key is set. |

## External data integrations

None of GHIN, live PGA Tour stats, or FanDuel odds have an open, free,
self-serve public API — all three require a licensed data provider. Rather
than blocking the app on that, every integration point is written as a
small adapter with a realistic mock fallback, so the product works fully
today and only needs an env var to go live:

- **GHIN** (`src/lib/ghin.ts`) — requires a USGA/state-association license.
  Set `GHIN_API_BASE_URL` / `GHIN_API_KEY` in `.env`.
- **PGA Tour live stats** (`src/lib/pga.ts`) — plug in a licensed provider
  (SportRadar Golf API, a PGA Tour data partnership, etc.) via
  `PGA_STATS_API_BASE_URL` / `PGA_STATS_API_KEY`.
- **FanDuel odds** (`src/lib/odds.ts`) — FanDuel has no public odds API;
  use a licensed aggregator such as [The Odds API](https://the-odds-api.com)
  that re-broadcasts FanDuel's lines, via `ODDS_API_KEY`.

See `.env.example` for the full list and inline comments.

## Closest-to-pin distance estimation, honestly

True depth-from-a-single-photo isn't reliable enough for a friendly wager.
Instead, `src/lib/distance.ts` uses a classic photogrammetry technique: the
photographer taps the flagstick's top and bottom (a known ~7ft/84in
reference object), which gives pixels-per-foot at that depth, then taps the
ball and the hole to convert their pixel distance into feet. It's an
approximation that assumes the ball and hole are roughly in the same focal
plane as the flag — good enough for a friendly closest-to-pin contest, and
it degrades gracefully to manual entry when no flagstick is visible.

## Known follow-ups before production

- **Next.js version**: pinned to the latest 14.2.x patch (14.2.35). Several
  CVEs affecting the Next.js 0.9–16.3 range (mostly Image Optimization API,
  middleware/rewrites SSRF, and Server Actions DoS — see `npm audit`) are
  only fixed in Next 15/16. This app doesn't use `next/image` optimization
  against remote hosts, custom middleware rewrites, or Server Actions in a
  way that's exposed to untrusted input, but a major-version upgrade is
  recommended before a public production deployment.
- **File storage**: handled by `src/lib/storage.ts` — uses Vercel Blob when
  `BLOB_READ_WRITE_TOKEN` is set, otherwise falls back to writing into
  `public/uploads` for local dev (that fallback won't persist on
  serverless hosts, so set the token in production).
