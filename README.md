# My OS

Personal operating system web app. Your life. Your system.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase Auth + PostgreSQL
- PWA-ready (installable)

## V1 scope

- Platform shell (auth, sidebar, dashboard, settings)
- Diet app (weekly dish / meal planner)
- App registry for adding more modules later

## Setup

1. Use Node 22+ (recommended: `nvm use` with `.nvmrc`)
2. Install dependencies:

```bash
npm install
```

3. Copy env and fill Supabase values:

```bash
cp .env.example .env.local
```

4. Run the SQL migration in the Supabase SQL editor:

`supabase/migrations/202609050001_init_platform_and_diet.sql`

5. Start the app:

```bash
npm run dev
```

## Scripts

- `npm run dev` - local development
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - lint

## Structure

- `src/platform` - shell, auth, app registry, AI client
- `src/apps/diet` - diet module
- `src/apps/notes` - notes module (+ AI assistant)
- `src/app` - routes only
- `src/components/ui` - design system
- `src/lib/supabase` - Supabase clients

## Notes AI

Set `OPENAI_API_KEY` in `.env.local` (optional `OPENAI_MODEL`, defaults to `gpt-4o-mini`).
The Notes editor includes a side assistant for summarize / rewrite / title / extract.
Suggestions apply to the editor only; saving still goes through normal note actions.
