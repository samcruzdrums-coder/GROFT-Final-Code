# GROFT

GROFT is an interactive folk-music traditions explorer with a globe, searchable catalog, source-aware detail pages, saved entries, and local CSV/JSON import.

## Run & Operate

- `pnpm --filter @workspace/groft run dev` — run the client-only frontend
- `pnpm --filter @workspace/groft run build` — build the static HTML, CSS, and JavaScript
- `pnpm --filter @workspace/groft run typecheck` — check the GROFT frontend
- GROFT requires no secrets, authentication, backend service, or database.
- The API server and database commands belong to separate shared workspace services; they are not required by GROFT.

## Stack

- GROFT: React + Vite client, deployed as static files
- Workspace services outside GROFT: Express 5 API, PostgreSQL + Drizzle ORM, and OpenAPI code generation
- Shared workspace tooling: pnpm, Node.js 24, TypeScript 5.9

## Where things live

- `artifacts/groft/` — GROFT React + Vite web app
- `artifacts/api-server/` — shared API service (not currently used by GROFT)
- `lib/api-spec/openapi.yaml` — shared API contract
- `lib/db/src/schema/` — shared database schema

## Architecture decisions

- GROFT is a client-only static app with no API calls, authentication, or database. Built-in traditions are in code; imports and favorites remain in browser local storage only. Keep its product scope unchanged unless new features are requested.
- Keep provenance and review status visible: imported entries marked verified should include sources.
- The globe uses a locally bundled NASA/GSFC Blue Marble texture, rasterized with Canvas 2D so it works without WebGL; SVG remains the interactive marker and graticule layer.

## Product

Explore folk traditions by globe location, region, text search, and review status. Each tradition includes instruments, forms, listening notes, sources, and optional media or rhythm notation. Users can save entries and import custom CSV/JSON catalogs.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `artifacts/groft/src/` for the app implementation
