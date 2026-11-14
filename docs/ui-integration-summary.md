# STI Ormoc Library UI integration

## Purpose

Combine the updated library interface, existing operational fixes and the complete feat/book-register functionality in a standalone application snapshot. This branch intentionally starts with one commit and does not import earlier repository history.

## Included changes

- Updated public catalog, authentication pages, shared navigation, account menu and role dashboards.
- Consistent light and dark styling, maintenance actions, attendance layout and responsive pages.
- Research collection filters, category sorting, school-email wording and saved attendance QR image retries.
- Book Register with per-copy costs and funding details, filtering, sorting and CSV download.
- Expanded ISBN/title/author lookups, search suggestions, automatic covers and category suggestions.
- Lookup-assisted spreadsheet imports and Find book details, with review before saving or exporting.
- Unsaved-change warnings on supported forms.
- Existing circulation, renewal, damage-case and lost-book workflows, with per-copy cost and legacy-price fallback.

## Database setup

The application source includes database/supabase/037_book_register.sql. Apply reviewed migrations required by the target database; do not replay an existing database blindly. The migration file is an instruction, not a copy of a database. Configure private connection settings in the deployment environment. The tracked .env.example is a setup template.

Local testing databases, accounts, passwords, private environment files, runtime uploads and machine-specific integration notes are not included.

## Verification

The application source matches the tested local checkpoint: 548 API tests and 373 frontend tests passed, along with root type checks and the production build. Coverage and isolated desktop/mobile browser checks passed during integration. The existing large-bundle warning remains. Live external book-provider lookups and a complete hosted deployment acceptance run were not performed.
