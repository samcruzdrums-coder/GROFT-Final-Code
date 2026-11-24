# GROFT

GROFT (Global Repository of Folkloric Traditions) is an interactive archive for
exploring folkloric traditions from around the world.

## What it includes

- A globe view and a searchable regional index of traditions.
- Tradition details, nearby-tradition discovery, and a “Surprise me” action.
- Account sign-in and per-account saved traditions.
- An Express API for health checks and saved traditions.
- A curated catalog and related media stored with the web app.

## Project layout

- `artifacts/groft` — React and Vite web app.
- `artifacts/api-server` — Express API, Clerk proxy, and favorites routes.
- `lib/db` — PostgreSQL database access and Drizzle schema.
- `lib/api-*` — shared API schemas and client.
- `api/[...path].ts` — Vercel function entry for the Express API.
- `vercel.json` — Vercel build, output, and SPA routing configuration.
- `artifacts/mockup-sandbox` — development-only component preview.

The web app serves the main experience at `/`, with `/sign-in`, `/sign-up`, and
`/user-portal` routes. The API is served under `/api`, including
`/api/healthz` and the saved-traditions endpoints.

## Development

This repository is a pnpm workspace. Use Node.js 24 and pnpm:

```sh
pnpm install --frozen-lockfile
```

The Vite configuration requires `PORT` and `BASE_PATH`:

```sh
PORT=25825 BASE_PATH=/ pnpm --filter @workspace/groft run dev
```

Run the API in a separate terminal:

```sh
PORT=3000 pnpm --filter @workspace/api-server run dev
```

The app expects `/api` requests to reach the API service. Replit's configured
workflows provide the app/API routing; a standalone local setup needs a
same-origin proxy for `/api`.

## Environment variables

Set credentials in the hosting platform's environment-variable settings. Do
not commit secret values.

| Variable | Used by |
| --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Web sign-in |
| `VITE_CLERK_PROXY_URL` | Web sign-in proxy URL |
| `CLERK_PUBLISHABLE_KEY` | API Clerk middleware |
| `CLERK_SECRET_KEY` | API Clerk proxy |
| `DATABASE_URL` | PostgreSQL favorites storage |

For Vercel, use an external Clerk tenant; Replit-managed Clerk is intended for
Replit-hosted apps. Existing accounts in a different Clerk tenant do not
transfer automatically. `DATABASE_URL` must point to a PostgreSQL database
reachable by Vercel.

## Vercel

The Vercel configuration is at the repository root. Set the Vercel project's
Root Directory to `.` (the repository root). The pnpm lockfile is at that same
root, and Vercel's package-manager detection can use it.

The configured build command is:

```sh
pnpm --filter @workspace/groft run typecheck
PORT=25825 BASE_PATH=/ pnpm --filter @workspace/groft run build
```

The web output is `artifacts/groft/dist/public`. Vercel serves the Express API
through `api/[...path].ts`; the SPA fallback excludes API paths and dotted
static asset paths.

Configure the environment variables above in Vercel for the environments you
use. Set `VITE_CLERK_PROXY_URL` to
`https://<deployment-domain>/api/__clerk` and allow the Vercel domain in the
external Clerk tenant. Preview deployments may need their own Clerk and
database settings.

## Checks

```sh
pnpm --filter @workspace/groft run typecheck
pnpm --filter @workspace/api-server run typecheck
PORT=25825 BASE_PATH=/ pnpm --filter @workspace/groft run build
```
