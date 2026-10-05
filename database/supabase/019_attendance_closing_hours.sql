-- Attendance closing time: regular open days close at 7:00 PM Asia/Manila.
-- Auto time-out and check-in gates read library_operating_schedule.closes_at.

UPDATE library_operating_schedule
   SET closes_at = TIME '19:00:00',
       opens_at = COALESCE(opens_at, TIME '07:00:00'),
       is_open = TRUE
 WHERE day_of_week BETWEEN 1 AND 6;

UPDATE library_operating_schedule
   SET is_open = FALSE,
       opens_at = NULL,
       closes_at = NULL
 WHERE day_of_week = 7;
