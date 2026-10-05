# Agent Handoff

**Date:** 2026-10-05  
**Repo:** https://github.com/keithjntlla/STI-College-Library-System  
**HEAD:** `633bbfd` — *Add attendance auto time-out, desk scan polish, and loan-mode weeding reports.* (`main` / `origin/main`)

Read `AGENTS.md`, `agent.md`, `RULE.md`, and `docs/schema-context.md` before changing code.

---

## What shipped

- **Attendance:** After-hours auto time-out (job runner); desk QR resolve → auto check-out or purpose-chip check-in; desk-first admin page; polished Usage insights (hour bars + weekly heatmap).
- **Books / desk:** Scan-first borrow/return, `loan_mode` (inside vs take-home), ready-hold claim, weeding list/alerts, `/librarian/reports`.
- **Clearance:** Lost-report → confirm/reject; standing ignores Awaiting Quotation; quotation needs file + PHP amount.
- **UI:** Shared `StatusPill` / `AlertMessage` tones (error red, warning yellow, success green, info blue).

Migrations prepared (unapplied): MySQL `048`–`049`, Supabase `018`–`019`. Next numbers `050` / `020`.

---

## Traps

- **Do not invent replacement prices** — quotation is evidence + amount only.
- **Standing ≠ open lost case:** Cleared can still show while Awaiting Quotation (by design unless product changes it).
- **Migrations 048/018 + 049/019 are unapplied** — loan_mode, weeding fields, and 19:00 `closes_at` need apply before live acceptance of those paths.
- Prefer feature modules under `apps/web/src/features/...` and `apps/api/src/modules/...`; keep `RULE.md` status in sync when panel items ship.

---

## Next

1. Apply reviewed Supabase `018` then `019` (and MySQL refs if needed); verify attendance close-at-19:00 and loan_mode/weeding on the live DB.
2. Deployed acceptance: lost-report → clearance → quotation → charge/waive; desk scan attendance + borrow path.
3. Product call: should **Awaiting Quotation** block clearance standing? Then continue open `RULE.md` / Phase backlog rows.
