# STI College Library System

Web-based library management for **STI College Ormoc** (SmartLib): catalog and inventory, borrow/return circulation, attendance, clearance, fines, printing, and role-based portals for students, faculty, librarians, and administrators.

## Stack

| Layer | Technology |
|-------|------------|
| Web | React, Vite, TypeScript, Tailwind CSS (`apps/web`) |
| API | Node.js, Express, TypeScript (`apps/api`) |
| Database | Schema and migrations under `database/` |
| Tooling | npm workspaces, Vitest / Node test runner |

```text
Browser (apps/web)
       |  /api
       v
Express API (apps/api)
       |
       v
Database (database/)
```

## Repository layout

```text
.
├── apps/
│   ├── web/          # Staff and student portals
│   └── api/          # Modular monolith API
├── database/         # SQL baseline and migrations
├── docs/             # Architecture and feature documentation
├── tools/            # Optional utilities
├── api/              # Hosting entry (e.g. Vercel)
├── _archive/         # Obsolete one-off scripts (ignore for daily work)
├── package.json      # Workspace scripts
└── README.md
```

`_archive/` keeps historical agent/codemod leftovers so nothing is lost. It is **not** used by the running app.

## Prerequisites

- Git
- Node.js **22.18+** (Node 24 recommended) and npm
- A configured database matching `database/` migrations (see `docs/` and `apps/api/.env.example`)

## Setup

```powershell
git clone https://github.com/keithjntlla/STI-College-Library-System.git
cd STI-College-Library-System
npm install
```

Copy environment templates and fill in secrets locally (never commit real `.env` files):

```powershell
copy apps\api\.env.example apps\api\.env
```

Apply schema/migrations using the scripts documented in `apps/api/package.json` (`db:schema`, `db:migrate`, etc.) and create an admin user with `npm run auth:create-user -w @sti-library/api` when ready.

## Common commands

From the repository root:

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start web + API together |
| `npm run dev:web` | Web only |
| `npm run dev:api` | API only |
| `npm test` | Run API and web tests |
| `npm run typecheck` | Typecheck both workspaces |
| `npm run build` | Production build |

Web default: Vite on port **5173**. API default: see `apps/api` env (`PORT`).

## Documentation

Additional guides live in [`docs/`](docs/). Agent and contributor conventions are in `AGENTS.md` and `agent.md`.

## License / status

Private academic project for STI College Ormoc. Version `0.1.0`.
