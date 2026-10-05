# Repository Instructions

## First stop for AI agents

1. Read the **AI agents — read this first** section at the top of [README.MD](README.MD) when present, otherwise continue below.
2. Follow always-on Cursor rules in [`.cursor/rules/`](.cursor/rules/) (engineering discipline, auth/privileged surfaces, frontend standards). The workspace root also mirrors these under `../.cursor/rules/`. Keep [`../GEMINI.md`](../GEMINI.md) aligned when those rules change.
3. Follow [`.cursor/agent-protocol.md`](.cursor/agent-protocol.md) for session start, plan status values, and the MySQL migration tracker.
4. When Ethan says **`start session`**, run that Start session protocol before building.

### Hard rules (summary)

- Prefer security and product correctness over convenience links or discoverability extras.
- Public Student/Faculty UI must never advertise `/admin/login` or staff-only workflows; use generic credential errors for wrong-role attempts on `/login`.
- Librarian (Admin) and Staff sign in at `/admin/login`; Students and Faculty at `/login`.
- Implement only the requested scope. If the user ends a prompt with `ans`, answer only — no edits. If the user includes `simp`, explain in plain non-technical language (no jargon; define necessary terms simply).

## Before making design, implementation, or database decisions

1. Read [docs/source-of-truth.md](docs/source-of-truth.md) and the latest manuscript, [REFERENCE.docx](../REFERENCE.docx), for the relevant feature.
2. Read and follow [agent.md](agent.md). For status pills/banners use `StatusPill` / `AlertMessage` tones in `apps/web/src/components/ui.tsx` (error=red, warning=yellow, success=green, info=blue).
3. Keep [RULE.md](RULE.md) current when shipping mock-defense revisions (status checklist).
4. Check the currently implemented schema contract in [docs/schema-context.md](docs/schema-context.md).
5. For hosted database work, also read [docs/supabase-migration-plan.md](docs/supabase-migration-plan.md).

The manuscript and source of truth define the target product. Older PDFs in `docs/source/` are previous drafts. The schema context describes the current database implementation. When they differ, plan a backward-safe migration instead of silently changing table meanings. The MySQL tree remains the rollback reference while the API dual-drives MySQL and Supabase Postgres.
