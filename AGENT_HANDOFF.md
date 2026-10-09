# Agent Handoff

**Date:** 2026-10-06  
**Repo:** https://github.com/keithjntlla/STI-College-Library-System  
**HEAD:** `d56cfa5` — *Upgrade research catalog with thesis covers, filters, and CSV import.* (`main` / `origin/main`)

Read `AGENTS.md`, `agent.md`, `RULE.md`, `docs/source-of-truth.md`, and `docs/schema-context.md` before changing code. Honor `.cursor/rules` (auth privileged surfaces, frontend standards, engineering discipline).

---

## What shipped (since prior handoff `633bbfd`)

### Librarian / portal
- Profile pictures, Approvals review UX, print supplies polish, Admin→Librarian merge work (`1b458d8`).
- Account + notification chrome moved into header menus; inbox polish (`b8726a3`).
- Course/program → category browse (`programs` / `program_categories`), dual-view mobile tables, denser book grids (`b937086`).
- Favicon from `apps/web/public/favicon.png`; global PortalLayout dotted background removed.

### Research / thesis catalog (`d56cfa5`)
- **Student/Faculty UI:** Cover **grid** (default) + table/list. Department-colored generated covers via `ThesisCoverCard` + `thesis-cover.ts` (IT blue / Tourism gold / Hospitality green / neutral).
- **Covers only in the grid** (and Add Research preview). **Do not** show the cover in `ResearchOverview` or other detail/list rows.
- Overview is a **centered BookOverview-style modal** (not a right drawer): title header, metadata, abstract, APA generate/copy. View-only — no borrow/cart.
- Filters: department, year, author, adviser (API + UI).
- Grid card spacing: equal row height, fixed title/dept/badge slots, `mt-auto` on **View details** so buttons align.
- Cover body text unified at ~10px; date line `11px` + lining numerals (`OCTOBER {year}`).

### Research admin / API
- `POST /catalog/bulk-import-research` (Librarian/Admin) — CSV templates under `apps/web/public/templates/research-import-*.csv`.
- Program allow-list: `apps/api/src/modules/catalog/research-programs.ts` (must match campus programs).
- Shelf labels like `Shelf A`–`Shelf D` (not `Shelf A-1` — that failed CSV validation).
- Diagnostic `RES-TEST-*` rows with the validation abstract were removed from the working DB after import testing.

### Migrations (MySQL refs under `database/migrations/`)
| File | Purpose | Next number |
| --- | --- | --- |
| `20261005_048_loan_mode_weeding.sql` | loan_mode + weeding | — |
| `20261005_049_attendance_closing_hours.sql` | closes_at 19:00 | — |
| `20261005_050_lost_book_resolved_notification.sql` | lost-book notify | — |
| `20261005_051_program_category_browse.sql` | `programs` + `program_categories` | **052** |

Supabase mirrors in `database/supabase/`: `018` loan_mode/weeding, `019` attendance close, `020` Admin→Librarian merge, `021` program browse. **Next Supabase number: `022`.** Confirm which are applied on the live `DATABASE_URL` DB before relying on programs browse or research CSV import in production — local apply of MySQL `051` was required once when import failed with `DATABASE_MIGRATION_REQUIRED`.

---

## Product / UX locks (do not regress)

- Research is **view-only** forever in student/faculty APIs (`viewOnly: true`); never cart, borrow, or reserve.
- Public Student/Faculty surfaces must **never** link or hint at `/admin/login` or staff portals.
- Book covers = file-backed `titles.cover_image_path`. Thesis covers = **generated UI only** (not uploaded cover pages).
- Prefer existing `StatusPill` / `AlertMessage` tones; STI blue `#0b5ea2` + yellow `#FFF200`.

---

## Printing / DOCX (ops + security)

- **DOCX on Vercel** needs a private Gotenberg/LibreOffice service: set `DOCX_RENDERER_URL` (HTTPS) and `DOCX_RENDERER_TOKEN` on the API only. Without both in production, the UI stays PDF-only (`isDocxAutoCountAvailable` fail-closed). Do **not** re-enable Puppeteer DOCX on Vercel.
- Upload hardening: MIME + magic bytes, `.docx` name check, macro/`vbaProject` rejection, zip-bomb bounds, 30 uploads / 15 min rate limit on quote+submit. Converted DOCX is stored as PDF in private `printing-documents`.
- **No in-app antivirus.** Staff PCs that download print files must run OS antivirus. The app is campus print-desk sandboxing, not a malware scanner.

## Traps

- Research CSV **department** must be an allowed campus program string; shelves must match managed location labels (e.g. `Shelf A`).
- Bulk research import needs `programs` tables (`051`) — missing tables surface as migration-required errors, not soft validation.
- Do not invent book replacement prices; quotation = evidence + amount only.
- Standing clearance can still show Cleared while Awaiting Quotation (by design unless product changes).
- `RULE.md` B5 (filter books by course) was deferred historically; **program→category browse** now exists — re-check B5 before rebuilding filters.
- Printing DOCX stays unavailable in production until Gotenberg URL **and** token are configured.

---

## Key files

| Area | Path |
| --- | --- |
| Research grid/overview | `apps/web/src/features/catalog/ResearchCatalog.tsx`, `ResearchOverview.tsx` |
| Thesis cover | `ThesisCoverCard.tsx`, `thesis-cover.ts` |
| Research API client | `research-catalog-api.ts` |
| Catalog admin + import UI | `CatalogManagementPage.tsx`, `AddResearchModal.tsx` |
| Bulk research import | `apps/api/src/modules/catalog/bulk-import.service.ts`, `research-programs.ts` |
| Admin route | `catalog-admin.routes.ts` → `POST /bulk-import-research` |
| Revisions tracker | `RULE.md` |

---

## Next (suggested)

1. Confirm live DB has MySQL `048`–`051` and Supabase through `021` applied; smoke research filters + CSV import + program browse on deployed site.
2. Deployed acceptance still open: lost-report → clearance → quotation; desk scan attendance + borrow.
3. Continue open `RULE.md` rows (auth polish A1–A5, occupancy D2–D5, Admin/Librarian merge R1, client try-out B12).
4. Product call: should **Awaiting Quotation** block clearance standing?
