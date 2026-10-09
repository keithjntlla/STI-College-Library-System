# Mock-defense revisions checklist

Living tracker for system revisions from [Revisions.docx](../Revisions.docx). PowerPoint presentation items are excluded. Status values: `done` | `partial` | `open` | `deferred` (unsafe literal reading; use the workaround).

When a listed item ships, bump its status here in the same change.

## Unsafe panel notes (do not build literally)

| Panel note | Workaround |
| --- | --- |
| Borrow/return with no input, fully automated | Two scans + Confirm. Typed ID/accession behind “Type instead”. |
| Any book older than 5 years is Outdated; hide from CHED exports | Optional textbook-category weeding flag + list + alert. No auto-archive. Export adds a column; does not drop rows. |
| Online request hides the book and starts 24h immediately | Keep title visible while `pending`. Claim timer starts at `ready_for_pickup`. |
| Import Juday’s file with no mapping | Wait for one real sample file. Do not guess columns. |
| Glossary required on every book | Synopsis / thesis abstract. Optional staff note. Do not block empty glossary. |
| Digital copies of copyrighted textbooks | Private file/link only when the library already owns the file. No public download. |
| Check-in then borrow as two separate scans | First student scan checks them in with purpose Book Borrowing when not already inside, then continues checkout. |
| Admin and Librarian as separate library bosses | Target rule in `agent.md`: one Librarian (Admin). App still has two logins until a later merge build. |

## System revisions

### Auth and landing

| ID | Item | Status | Notes |
| --- | --- | --- | --- |
| A1 | Login title “STI COLLEGE ORMOC” | open | Always include Ormoc. |
| A2 | Hidden staff login URL; no role dropdown; redirect by DB role | partial | `/admin/login` exists; student login still shows roles in places. Align with panel `/staff` idea later. |
| A3 | Forgot password with school Outlook OTP, expiry, rate limit, no reuse of old password | open | |
| A4 | UI standards; Log In button label; red errors allowed with text | partial | Palette updated in `agent.md`. Apply on auth screens as they are touched. |
| A5 | Enrollment gate / registrar list before registration | open | No live registrar sync (manuscript limit). Manual approved list is the fallback. |

### Dashboard and occupancy

| ID | Item | Status | Notes |
| --- | --- | --- | --- |
| D1 | Dashboard shows urgent queues and actions | partial | Librarian desk rebuilt; keep seed data for demos. |
| D2 | Occupancy excludes short visits such as printing | open | |
| D3 | Special library use (class, meeting, seminar) | open | |
| D4 | Fix peak hour / occupancy time | open | |
| D5 | Clickable overview modules with hover affordance | open | |

### Books, circulation, inventory

| ID | Item | Status | Notes |
| --- | --- | --- | --- |
| B1 | Scan-first borrow/return; block on fines, overdue, clearance, unpaid replacement; photo + book card; Confirm | done | Scan-first desk; typed path behind Type instead; server blocks clearance-style holds and unpaid replacement. |
| B2 | Inside-library vs take-home loan | done | `loan_mode` on borrow_transactions; inside due at closing, no overnight fine. |
| B3 | Student scan opens ready reservation; Verify & Checkout | done | Ready hold surfaces from student scan; timer stays on ready_for_pickup. |
| B4 | Attendance purpose Book Borrowing; check-in before borrow | done | Checkout and print pickup require an open attendance visit. Desk attendance QR check-in (Book Borrowing / Printing) must happen first; checkout no longer auto-inserts a visit. |
| B5 | Catalog filter by course/program | deferred | Categories are subjects, not degrees. Needs program map. |
| B6 | Synopsis / glossary / book details | partial | Synopsis done. Glossary deferred. |
| B7 | Digital copies when library owns them | deferred | Rights-gated. |
| B8 | CSV import matching Juday’s format | deferred | Waiting for sample. Template import exists. |
| B9 | CHED 5-year copyright / weeding list / alerts | done | Optional category textbook flag, copyright year, weeding list + alert. Inventory export keeps every row and adds a review column. |
| B10 | Maintenance CRUD labeled; shelves/categories | partial | Catalog, categories, floor plan exist. Textbook recency switch on categories. |
| B11 | Separate Reports module (not inside maintenance) | done | `/librarian/reports` for inventory and weeding. Import stays on catalog maintenance. |
| B12 | Client (Ma’am Juday) try-out | open | Process, not code. |
| B13 | Demo QR codes and barcoded books | open | Demo prep. |

### Attendance QR

| ID | Item | Status | Notes |
| --- | --- | --- | --- |
| Q1 | Auto detect check-in vs check-out | done | Resolve open visit → immediate check-out; otherwise purpose chips check in. |
| Q2 | Purpose via buttons at desk, or purpose baked into student QR | done | Desk purpose chips (not baked into permanent QR). |

### Roles

| ID | Item | Status | Notes |
| --- | --- | --- | --- |
| R1 | Librarian = Admin (Ma’am Juday); staff = second admin | partial | Written in `agent.md` / source-of-truth. App still split. |

### STI / data

| ID | Item | Status | Notes |
| --- | --- | --- | --- |
| S1 | Connect to STI enrollment or approved registrar report | open | See A5. |
| S2 | Exact physical book counts (not rough estimates in presentation) | open | Data/ops. |

## Current book build focus

Book desk, loan mode, ready claim, weeding, and collection reports are done for this pass. Remaining open rows stay tracked only.
