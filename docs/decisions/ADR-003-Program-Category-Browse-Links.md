# ADR-003: Program–category browse links for student catalog

## Status
Accepted

## Date
2026-10-05

## Context
Students need to browse the book catalog by course (for example Information Technology → Programming, Coding). Categories are already librarian-managed subject shelves tied to floor-plan locations. Campus programs exist only as registration/`program_strand` strings. Hardcoding course→category maps in the frontend would fight the “categories are dynamic” rule and break when programs or shelves change.

## Decision
Maintain a many-to-many browse mapping:

1. `programs` stores campus program labels (seeded to match registration options).
2. `program_categories` links programs to subject `categories`.
3. Librarians edit links on Category Management create/edit (“Relevant for courses”).
4. Student/Faculty catalog starts on **All courses**. Selecting a course narrows the category list and constrains book results to linked categories (`program_id` on catalog APIs). Empty links yield empty results, not a fallback to the full catalog.
5. Categories remain the shelf authority; program links are discovery only and do not change title categorization or copy locations.

## Alternatives considered

### Hardcode course → category names in the UI
- Pros: no schema work
- Cons: drifts from live categories; unmaintainable across program changes
- Rejected

### Infer relevance only from borrow history
- Pros: no maintenance
- Cons: too fuzzy for a reliable browse filter (kept for dashboard recommendations only)
- Rejected for this filter

### Dewey-only browse
- Pros: standard classification
- Cons: call-number tooling is not live; not ready as the primary course filter
- Rejected for this pass

## Consequences
- MySQL `051` / Supabase `021` add `programs` and `program_categories`.
- Category create/update payloads accept `programIds`; catalog exposes `GET /api/v1/catalog/programs` and `program_id` on categories/books.
- Staff still cannot mutate categories; no new privileged nav entry.
- Out of manuscript: operational discovery aid on top of dynamic categories.
