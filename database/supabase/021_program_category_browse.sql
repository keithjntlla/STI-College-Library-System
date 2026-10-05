-- Campus programs and many-to-many browse links to subject categories.
-- Next Postgres file after this: 022.

CREATE TABLE IF NOT EXISTS programs (
  program_id SERIAL PRIMARY KEY,
  program_name VARCHAR(150) NOT NULL,
  program_group VARCHAR(40) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NULL,
  CONSTRAINT uq_programs_name UNIQUE (program_name)
);

CREATE INDEX IF NOT EXISTS idx_programs_group_active
  ON programs (program_group, is_active);

CREATE TABLE IF NOT EXISTS program_categories (
  program_id INTEGER NOT NULL REFERENCES programs (program_id) ON DELETE CASCADE ON UPDATE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories (category_id) ON DELETE CASCADE ON UPDATE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (program_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_program_categories_category
  ON program_categories (category_id);

INSERT INTO programs (program_name, program_group) VALUES
  ('Bachelor of Science in Information Technology', 'College'),
  ('Bachelor of Science in Tourism Management', 'College'),
  ('Bachelor of Science in Hospitality Management', 'College'),
  ('STEM', 'SHS Academic'),
  ('ABM', 'SHS Academic'),
  ('HUMSS', 'SHS Academic'),
  ('General Academic', 'SHS Academic'),
  ('IT in Mobile App and Web Development', 'SHS TechPro'),
  ('Computer and Communications Technology', 'SHS TechPro'),
  ('Tourism Operations', 'SHS TechPro'),
  ('Culinary Arts', 'SHS TechPro')
ON CONFLICT (program_name) DO UPDATE
  SET program_group = EXCLUDED.program_group,
      is_active = TRUE,
      updated_at = NOW();
