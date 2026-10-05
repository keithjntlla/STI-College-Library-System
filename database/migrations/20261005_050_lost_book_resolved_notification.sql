-- Allow admin audit rows when a lost-book charge is waived or quoted.
-- MySQL rollback reference. Next number after this file: 051.

ALTER TABLE `admin_notifications`
  MODIFY COLUMN `event_type` ENUM(
    'reservation_requested','reservation_cancelled','borrow_request_submitted','borrow_request_cancelled',
    'checkout_confirmed','return_completed','overdue_detected','lost_book_reported','lost_book_confirmed',
    'lost_book_resolved','weeding_review'
  ) NOT NULL;
