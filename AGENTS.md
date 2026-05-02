# AGENTS.md

## Cursor Cloud specific instructions

### Overview

RareImagery is a Next.js 16 (App Router, React 19, TypeScript 5) creator-commerce platform. The frontend is the only service in this repository; the Drupal 11 CMS backend lives in a separate repo (`rareimage_back`) and is not available in this workspace.

### Node version

The project requires Node.js 20.20.2 (see `.nvmrc`). nvm is available in the VM; source it with:
```
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

### Package manager

This project uses **npm** (lockfile: `package-lock.json`). Do not use yarn/pnpm.

### Key commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (port 3000) |
| Lint | `npm run lint` |
| Type check | `npm run typecheck` |
| Build | `npm run build` |
| Tests | `npm test` |
| Architecture validation | `npm run validate` |

### Environment variables

A `.env.local` file is required for the dev server. At minimum it needs:
- `DRUPAL_API_URL` — Drupal backend URL (stub: `http://localhost:8080`)
- `DRUPAL_API_USER` / `DRUPAL_API_PASS` — Drupal API credentials
- `NEXTAUTH_SECRET` — session encryption secret
- `NEXTAUTH_URL` — canonical app URL (`http://localhost:3000`)

The `src/instrumentation.ts` file validates these on startup and logs warnings for missing optional vars (social OAuth keys, etc.).

### Gotchas

- **Lint exits non-zero**: The codebase has ~26 pre-existing ESLint errors and ~418 warnings. `npm run lint` will exit with code 1. The CI pipeline runs lint, but these errors exist on `main`.
- **Drupal backend not available**: The Docker Compose setup (`docker-compose.yml`) expects a sibling `../rareimage_back` directory with the Drupal codebase. Without it, only the Next.js frontend can run standalone. All Drupal-dependent features (stores, products, profiles) will show errors or empty states in the UI.
- **Build requires env vars**: `npm run build` needs `DRUPAL_API_URL` and `NEXTAUTH_SECRET` set (even stub values work). The CI workflow sets these as env vars.
- **No pre-commit hooks**: There are no husky, lint-staged, or pre-commit hooks configured.
