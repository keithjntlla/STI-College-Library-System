-- Merge library-policy Admin (System Administrator) accounts into Librarian.
-- One Librarian role owns operations and account governance. Technical hosting
-- remains outside this application role.

BEGIN;

UPDATE accounts
   SET role = 'Librarian',
       updated_at = COALESCE(updated_at, NOW())
 WHERE role = 'Admin';

UPDATE users
   SET user_role = 'Librarian'
 WHERE user_role = 'Admin';

UPDATE users
   SET user_role = 'Librarian'
 WHERE user_role = 'System Administrator';

COMMIT;
