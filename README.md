# SBNutrition

Nutrition tracker for Stony Brook University students. It pulls every campus menu from
[stonybrook.nutrislice.com](https://stonybrook.nutrislice.com/) daily. Students sign in with Google,
tap the foods they ate, and the app tracks calories, macros, vitamins, minerals, ingredients and
allergens across days, weeks and months.

## Features

- **Live campus menus** for every location Nutrislice lists (East/West Side Dine-In, SAC, Roth, Jasmine,
  cafés…), by station, for any date. New or removed locations show up automatically.
- **Servings**: every item can be logged with fractional servings. East and West Side Dining (self-serve
  buffets) get quick picks (½, 1, 1½, 2, 3) and a note about the portion size each serving represents.
- **Full nutrition**: every nutrient Nutrislice reports (calories, fat, saturated/trans fat, cholesterol,
  sodium, carbs, fiber, sugars, added sugars, protein, vitamins A/C/D, calcium, iron, potassium), with
  %DV, ingredients, diet tags and allergens.
- **Meals you name yourself**: create as many meals per day as you like ("Brunch after lab", "Late-night
  snack"…), add foods to them from any menu, rename or delete them, and move foods between them.
- **History**: 7/30/90-day views with a per-day chart (calories or any macro), daily averages for every
  nutrient, and a day-by-day table.
- **Goals** for calories, protein, carbs and fat.
- **Closed days**: if a location has no menu posted for a date, the app says so instead of showing stale food.

## How menus stay current

`lib/menus.ts` caches Nutrislice data in the database:

1. A scheduled job (`/api/cron/sync`, twice daily on Vercel via `vercel.json`, or `npm run sync` from
   any cron) refetches the location list plus this week and next week for every menu.
2. As a fallback, any menu for yesterday onward is refetched on demand once its cache is older than 6 hours.
3. If Nutrislice is down, the last cached copy is served.

When a food is logged, its nutrition is copied into the log entry, so a student's history stays the same
after the menu rotates.

## Local setup

```bash
npm install
cp .env.example .env          # then fill in the values below
npx prisma db push            # creates prisma/dev.db (SQLite)
npm run sync                  # optional: pre-load all menus
npm run dev                   # http://localhost:3000
```

Set `ALLOW_DEV_LOGIN="true"` in `.env` to sign in with just an email locally (disabled in production builds).

### Google sign-in

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Configure the OAuth consent screen (External; scopes: `email`, `profile`, `openid`).
3. Create an **OAuth client ID** of type *Web application* with these authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://YOUR-DOMAIN/api/auth/callback/google`
4. Put the client ID and secret in `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

Anyone with a Google account can sign in. Signing in is only used to save each person's log to their own account.

## Deploying (Vercel + Postgres)

1. Create a Postgres database (Vercel Postgres, Neon, Supabase…).
2. In `prisma/schema.prisma` change `provider = "sqlite"` to `provider = "postgresql"`.
3. In Vercel, set `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, `CRON_SECRET`.
4. Run `npx prisma db push` against the production database once, then deploy.
   Vercel Cron calls `/api/cron/sync` at 09:00 and 15:00 UTC with `Authorization: Bearer $CRON_SECRET`.

When hosting elsewhere, run `npm run build && npm start` and schedule `npm run sync`
(or `curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR-DOMAIN/api/cron/sync`) at least daily.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / server |
| `npm run sync` | Refresh all cached menus now |
| `npm test` | Unit tests (parser, nutrition math, dates, cache freshness) |
| `npm run typecheck` | TypeScript check |

## Project layout

- `lib/nutrislice.ts`: Nutrislice API client and parser
- `lib/menus.ts`: DB cache, freshness rules, full sync
- `lib/nutrients.ts`: nutrient catalog, daily values, math
- `lib/auth.ts`: NextAuth (Google) configuration
- `app/api/*`: JSON API (menus, logs, history, goals, cron)
- `app/*`, `components/*`: UI (Next.js App Router + Tailwind)

## Data notes

Nutrislice's `mg_vitamin_d` field holds values that don't fit milligrams (e.g. 88), and the
vitamin A fields come in several units. These are shown exactly as reported, with no %DV.
