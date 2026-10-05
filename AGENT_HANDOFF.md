# Agent Handoff & Current State

**Date:** 2026-10-05  
**Repo:** https://github.com/keithjntlla/STI-College-Library-System  
**HEAD:** `d960505` — *Improve lost-book clearance and supplier quotation workflows.* (`main` / `origin/main`)  
**Audience:** Next AI agent or developer picking up `StiOrmocLibrary`.

Read `GEMINI.md` and `REFERENCE.pdf` before changing code. Prefer real feature modules under `apps/web/src/features/...` and `apps/api/src/modules/...` over static mock pages.

---

## 1. What just shipped (this session)

### Lost-book student → librarian path
- Student **Report lost** creates a **Pending** `lost_book_reports` row; the copy/loan is **not** marked Lost until staff confirm.
- Librarian **Clearance** (`/librarian/clearance`) shows a soft-refreshing worklist: **Lost-book reports awaiting review**.
- Staff open **Review** → Confirm (in-app `ConfirmModal`, not `window.confirm`) or Reject.
- Confirm with an existing supplier quotation → charge **Quoted**; without one → **Awaiting Quotation** (no invented price).

### Clearance standing (easy to misread)
Master-list **Standing = Cleared** only looks at:
- Unreturned loans where `lost_confirmed_at IS NULL`
- Unpaid overdue fines
- Unpaid **Quoted** replacement charges

So after **Confirm loss** with **Awaiting Quotation**, Standing can correctly show **Cleared** — the open lost case still appears under Lost-book reports, but awaiting quotation is not a standing blocker.

### Non-monetary resolution
**Document non-monetary resolution** = **Waive**: loss stays on record, **no PHP charge**, reason ≥ 10 characters (e.g. in-kind replacement, authorized waiver). Opposite of **Confirm quotation charge**.

### Supplier quotation UX
- Clearance links **Upload supplier quotation** / **Attach quotation in catalog** deep-link to  
  `/librarian/catalog?titleId=…&action=quotation&title=…`  
  and [CatalogManagementPage.tsx](apps/web/src/features/catalog/CatalogManagementPage.tsx) opens [BookQuotationModal.tsx](apps/web/src/features/catalog/BookQuotationModal.tsx).
- A quotation requires **both** a supplier file (PDF/JPEG/PNG, private storage) **and** a PHP amount. File = audit evidence; amount = charge used on clearance. Upload enables only when both are valid.

### Other UI polish in the same commit
- Student borrowing history layout/status polish; Report lost warning + success modal tweaks.
- Student-facing book detail / cart overview: **barcode not shown** (staff asset tools still have codes).
- Clearance review dialog: `lg:left-[var(--sidebar-offset)]`, sticky header, Escape close, z above sidebar.
- Circulation monitor lost-report status badges.

---

## 2. Key files

| Area | Path |
| --- | --- |
| Clearance API (standing, confirm, resolve Charge/Waive) | `apps/api/src/modules/clearance/clearance.service.ts` |
| Report lost API | `apps/api/src/modules/circulation/circulation.service.ts` |
| Librarian clearance UI | `apps/web/src/features/clearance/AdminClearancePage.tsx` |
| Quotation modal | `apps/web/src/features/catalog/BookQuotationModal.tsx` |
| Catalog deep-link | `apps/web/src/features/catalog/CatalogManagementPage.tsx` |
| Quotation API/storage | `apps/api/src/modules/catalog/book-quotation.ts` |
| Student history / Report lost | `apps/web/src/features/circulation/BorrowingHistory.tsx`, `ReportLostDialog.tsx` |

---

## 3. Product / architecture notes still true

- **Stack:** React/Vite/Tailwind web + Express API; production target is Vercel + Supabase Postgres (local MySQL is reference/rollback only).
- **Quotation vs purchase price:** Quotation is optional catalog evidence for replacement charge; do not invent a price or silently fall back to old purchase price.
- **ConfirmModal / overlays:** Prefer shared `ConfirmModal` and sidebar-offset overlays (`--sidebar-offset`) over browser `confirm` and full-bleed dialogs that sit under the portal sidebar.
- **CSV bulk title import:** Catalog management has CSV import for books; do not confuse with older `bulk-book` “many physical copies for one title” helpers.

---

## 4. Suggested next work

1. **Deployed acceptance** of the lost-report → clearance → quotation → charge/waive path on the live site (Phase 1 B6 / Phase 2 A8 style checks in `docs/system-fixes-and-features-plan.md`).
2. Whether **Awaiting Quotation** should block clearance standing (product decision; currently it does not).
3. Continue Phase 2/3 backlog from `docs/system-fixes-and-features-plan.md` (durable jobs, reservation status actions, invoices, etc.).
4. Keep Impeccable / GEMINI UI standards on any new frontend surfaces.

---

## 5. Verify locally

```bash
# From StiOrmocLibrary/apps/web
npm test -- --run src/features/clearance/AdminClearancePage.test.tsx src/features/catalog/CatalogManagementPage.test.tsx src/features/catalog/BookQuotationModal.test.tsx
```

---

*Older catalog-cover / PublicCatalog notes from prior handoffs remain in git history if needed; this file prioritizes the lost-book and quotation work that was just pushed.*
