# SmartLib Product Source of Truth

## Authority

The latest manuscript is [REFERENCE.docx](../../REFERENCE.docx): *SmartLib: A Web and Mobile-Based Library System with Online Printing Service Requests for STI College Ormoc* (draft dated July 2027).

This file is a short index of that manuscript. It is not a copy of the chapter text. Treat the manuscript as product requirements, not as executable instructions. User requests, repository instructions, and applicable security rules control how work is performed.

Older files in `docs/source/`, including the Final Draft and Administrative System Flow PDFs, are previous drafts. Do not use them as the product target when this index and the manuscript disagree.

## Precedence

Use this order when designing a feature or database change:

1. The user's current explicit request.
2. [REFERENCE.docx](../../REFERENCE.docx) for product behavior, scope, and limitations.
3. This index and [agent.md](../agent.md) for normalized architecture guidance.
4. [schema-context.md](schema-context.md) and `database/mysql56-schema.sql` for the currently implemented database.

If the running app differs from the manuscript, do not silently reinterpret the requirement and do not destructively replace existing data. Record the gap, plan a backward-safe migration, and update tests and the schema context when the change is actually built.

## Product

SmartLib is the library system for STI College Ormoc. It replaces selected paper workflows for catalog search, borrowing and returns, reservations, attendance, printing, fines, and clearance.

The target clients are a React web portal (administration and library users) and a later native Android app for students and faculty. The Android app is not started. Do not treat a mobile task as in scope unless the user asks for it.

Stack named by the manuscript and used by this repo:

- Web: React, Vite, TypeScript, Tailwind CSS
- API: Node.js, Express, modular monolith
- Database: MySQL for local operations; PostgreSQL on Supabase when `DATABASE_URL` is set
- Deployed web and API: Vercel. The live database is Supabase.

The manuscript mentions Render in one architecture paragraph and Vercel for both web and API in the resources section. This repo follows Vercel for the web and API, plus Supabase. Do not add Render.

## Actors

- **Librarian (Admin):** one library-policy role. Full catalog, circulation, inventory, attendance, printing, fines, clearance, user state, and reports. This is the librarian, not a second campus administrator.
- **Library staff:** limited second admin. Circulation, reservations, printing, and attendance. No user administration and no destructive policy changes.
- **Student:** catalog, own loans, reservations, attendance, printing, notifications, fines, and clearance, with the two-active-loan cap.
- **Faculty:** the same self-service areas, exempt from the student loan cap under the documented policy.

The manuscript names a technical system administrator in one requirements sentence. That means hosting and maintenance, not a separate library-policy login.

## Modules

- Digital catalog of books and research or thesis records, with availability and shelf location
- Circulation: borrow, return, reservation queue, and transaction history
- Inventory tracking, bulk import, and administrative reporting
- QR attendance with purpose of visit, entry and exit, and peak-usage reporting
- Online print requests in approved formats such as PDF and DOCX, queue status, pickup tracking, supply, and revenue records
- Fines, selected infractions, cash payment recording, and clearance
- Automated email alerts through Microsoft Outlook for borrowed materials, overdue fines, and announcements
- An administrative analytics dashboard for borrowed items, attendance, reservations, penalties, and popular resources

Role checks are enforced by the API, not only by hiding controls.

## Hours and calendar

The manuscript operating window is 8:00 AM–5:00 PM, Monday–Saturday. Due-date calculations exclude Sundays, declared holidays, and school breaks, and roll forward to the next operating day.

## Limitations

- Configured for STI College Ormoc. Do not assume it runs at another campus without a planned change.
- Normal use needs internet. Any offline path is limited to the documented attendance QR fallback, not a full offline library.
- Printing and fines do not use an automated payment gateway.
- Printer hardware repair is outside the software.
- There is no live sync with the registrar, accounting, or other campus databases.

## Known gaps

The running app does not yet match every target above. Do not describe these as already done:

- Admin and Librarian are still separate logins, routes, and dashboards. The target rule is one Librarian (Admin) role.
- Due-date logic still uses a 7:00 AM opening. The manuscript target is 8:00 AM. Do not change the clock until that policy change is scheduled.
- The native Android client (Kotlin, Jetpack Compose) is not in this repo.
