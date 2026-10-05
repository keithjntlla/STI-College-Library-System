-- Loan mode (take-home vs inside library), copyright year, and textbook weeding flag.
-- Next Postgres file after this: 019.

ALTER TABLE borrow_transactions
  ADD COLUMN IF NOT EXISTS loan_mode VARCHAR(16) NOT NULL DEFAULT 'TakeHome';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'borrow_transactions_loan_mode_check'
  ) THEN
    ALTER TABLE borrow_transactions
      ADD CONSTRAINT borrow_transactions_loan_mode_check
      CHECK (loan_mode IN ('TakeHome', 'InsideLibrary'));
  END IF;
END $$;

ALTER TABLE titles
  ADD COLUMN IF NOT EXISTS copyright_year SMALLINT;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS textbook_recency_rule BOOLEAN NOT NULL DEFAULT FALSE;
