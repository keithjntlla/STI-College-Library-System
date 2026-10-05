-- Loan mode (take-home vs inside library), copyright year, and textbook weeding flag.
-- MySQL rollback reference. Next number after this file: 049.

ALTER TABLE `borrow_transactions`
  ADD COLUMN `loan_mode` ENUM('TakeHome','InsideLibrary') NOT NULL DEFAULT 'TakeHome'
  AFTER `transaction_status`;

ALTER TABLE `titles`
  ADD COLUMN `copyright_year` SMALLINT UNSIGNED NULL
  AFTER `publication_year`;

ALTER TABLE `categories`
  ADD COLUMN `textbook_recency_rule` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0
  AFTER `description`;

ALTER TABLE `admin_notifications`
  MODIFY COLUMN `event_type` ENUM(
    'reservation_requested','reservation_cancelled','borrow_request_submitted','borrow_request_cancelled',
    'checkout_confirmed','return_completed','overdue_detected','lost_book_reported','lost_book_confirmed',
    'weeding_review'
  ) NOT NULL;
