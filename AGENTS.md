# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a Next.js 16 (App Router, React 19, TypeScript strict) frontend for the RareImagery creator platform. It communicates with a separate Drupal 11 backend via JSON:API. The Drupal backend repo is **not** in this workspace.

### Node.js version

The project uses Node.js 20.20.2 (specified in `.nvmrc`). After the update script runs, nvm is available and Node is on PATH.

### Key commands

| Task | Command |
|------|---------|
| Install deps | `npm ci` |
| Dev server | `npm run dev` (port 3000) |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Build | `npm run build` |
| Architecture validation | `npm run validate` |
| Handler tests | `npm run test:handlers` |
| Full test suite (Phase 1 only) | `npm run test -- --phase1-only` |
| Integration tests (needs running server + Drupal) | `npm run test:integration` |

### Environment variables

A `.env.local` file is required for the dev server and build. At minimum set:
- `NEXTAUTH_URL=http://localhost:3000`
- `NEXTAUTH_SECRET=<any-string>`
- `DRUPAL_API_URL=http://localhost:8080`

See `deploy/.env.production.example` for a full list. Features gracefully degrade when optional API keys (Stripe, xAI, X OAuth, etc.) are absent.

### Build caveats

- `npm run build` requires `DRUPAL_API_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` to be set (even placeholder values work).
- The build emits typed routes; `next.config.ts` sets `typedRoutes: true`.
- Pre-existing lint errors (26 errors, 418 warnings) are in the codebase and do not block builds.

### Testing notes

- **Phase 1** tests (build, lint, validate, handlers) run offline with no external services.
- **Phase 2** integration tests require the dev server running plus a live Drupal backend on port 8080 and correct API credentials. These are not runnable in the Cloud Agent environment without the Drupal backend.
- The `docker-compose.yml` expects a sibling `../rareimage_back` directory for the Drupal source; this is unavailable in Cloud Agent VMs.

### Architecture

- `src/app/` — Next.js App Router pages and API routes
- `src/lib/` — Shared utilities, Drupal client, auth config, AI agents
- `src/components/` — React components
- `scripts/` — Test runners and validation scripts
- `docker/` — Docker configs for local full-stack dev
