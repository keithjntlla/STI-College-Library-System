-- Campus programs and many-to-many browse links to subject categories.
-- MySQL rollback reference. Next number after this file: 052.

CREATE TABLE IF NOT EXISTS `programs` (
  `program_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `program_name` VARCHAR(150) NOT NULL,
  `program_group` VARCHAR(40) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`program_id`),
  UNIQUE KEY `uq_programs_name` (`program_name`),
  KEY `idx_programs_group_active` (`program_group`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `program_categories` (
  `program_id` INT UNSIGNED NOT NULL,
  `category_id` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`program_id`, `category_id`),
  KEY `idx_program_categories_category` (`category_id`),
  CONSTRAINT `fk_program_categories_program`
    FOREIGN KEY (`program_id`) REFERENCES `programs` (`program_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_program_categories_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `programs` (`program_name`, `program_group`) VALUES
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
ON DUPLICATE KEY UPDATE
  `program_group` = VALUES(`program_group`),
  `is_active` = 1,
  `updated_at` = NOW();
