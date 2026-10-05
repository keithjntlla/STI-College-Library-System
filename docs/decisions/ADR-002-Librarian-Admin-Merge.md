# ADR-002: One Librarian (Admin) library-policy role

## Status
Accepted

## Date
2026-10-05

## Context
Phase 6 temporarily split library policy into two JWT roles: `Admin` (account governance) and `Librarian` (operations). Panel feedback and the manuscript require a single library head role: the librarian *is* the admin. Keeping two logins, dashboards, and approval gates blocked that person from both approving registrations and running circulation in one session.

## Decision
Merge library-policy `Admin` into `Librarian`:

1. Public registration accepts **Student** and **Faculty** only, with Outlook OTP then Librarian approval.
2. Librarian owns the combined portal: operations plus Users, User archive, Approvals, and account alerts.
3. Existing `Admin` / System Administrator account rows migrate to `Librarian` (`020_merge_admin_into_librarian.sql`).
4. `/admin/*` page routes redirect to `/librarian/*`. `/admin/login` becomes a signpost to `/login`.
5. Technical system administration remains hosting/DB/deploy (CLI/infra), not a second in-app library boss.
6. **Staff** stays a limited desk role, provisioned by the Librarian (not public self-signup).

## Alternatives considered

### Keep separate Admin and Librarian
- Pros: smaller blast radius for account tools
- Cons: contradicts panel and manuscript; forces dual logins for one person
- Rejected

### Rename JWT role to `LibrarianAdmin`
- Pros: clearer label
- Cons: larger enum/migration churn for the same permission set
- Rejected for this pass; keep JWT label `Librarian`

## Consequences
- API mounts that were Admin-only now require `Librarian`.
- Combined librarian dashboard shows ops KPIs and account overview cards.
- Leftover `Admin` JWT claims remain accepted on librarian web routes until tokens expire.
- Phase 6 interim docs that described a separate Admin workspace are superseded by this ADR.
