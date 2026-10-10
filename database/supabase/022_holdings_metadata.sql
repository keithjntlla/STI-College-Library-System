-- Records that a book title has already been checked for an online cover and synopsis.
-- Next Postgres file after this: 023.

ALTER TABLE titles ADD COLUMN IF NOT EXISTS synopsis TEXT;
ALTER TABLE titles ADD COLUMN IF NOT EXISTS metadata_checked_at TIMESTAMPTZ;
