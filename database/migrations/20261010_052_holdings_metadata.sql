-- Cover and synopsis lookup marker. MySQL rollback reference.
-- Next number after this file: 053.

SET @database_name = DATABASE();

SET @add_synopsis = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @database_name AND TABLE_NAME = 'titles' AND COLUMN_NAME = 'synopsis') = 0,
    'ALTER TABLE `titles` ADD COLUMN `synopsis` TEXT NULL AFTER `cover_image_path`',
    'SELECT 1'
  )
);
PREPARE add_synopsis_statement FROM @add_synopsis;
EXECUTE add_synopsis_statement;
DEALLOCATE PREPARE add_synopsis_statement;

SET @add_checked = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @database_name AND TABLE_NAME = 'titles' AND COLUMN_NAME = 'metadata_checked_at') = 0,
    'ALTER TABLE `titles` ADD COLUMN `metadata_checked_at` DATETIME NULL AFTER `synopsis`',
    'SELECT 1'
  )
);
PREPARE add_checked_statement FROM @add_checked;
EXECUTE add_checked_statement;
DEALLOCATE PREPARE add_checked_statement;
