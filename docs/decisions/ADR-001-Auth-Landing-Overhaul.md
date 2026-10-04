# ADR-001: Authentication and Landing Page Overhaul

## Status
Accepted

## Date
2026-09-30

## Context
The existing library system used a standard login page as the main entry point (`/`), requiring users to manually select their role from a dropdown (Admin, Librarian, Student, etc.).
Key issues with this approach:
1. **UX Friction**: Forcing users to select their role adds unnecessary friction.
2. **Security & Obscurity**: Administrative logins were publicly accessible alongside student logins.
3. **Public Discoverability**: New or prospective users couldn't see the library's catalog without logging in first.
4. **Account Recovery**: No self-service password reset mechanism existed.

## Decision
We implemented a complete overhaul of the authentication flow and the landing page experience:

1. **Auto-Role Detection**: We removed the `login_as` dropdown. The backend now queries the database using the `school_id` to automatically determine the correct account role and issues the appropriate JWT.
2. **Hidden Admin Portal**: The administrative login has been moved to a separate URL (`/admin/login` or `/staff`), removing it from the public view. True security is enforced by backend JWT Role-Based Access Control (RBAC), not just the hidden URL.
3. **Public Catalog Landing Page**: The root URL (`/`) now displays the library catalog (similar to Shopee.ph). Users can browse books without an account. Only when they attempt to borrow/reserve are they prompted to log in.
4. **Secure "Forgot Password"**: 
   - A new self-service password reset flow using 6-digit OTPs sent via school email.
   - Enforced a 15-minute account lockout after 3 failed OTP attempts.
   - Prevented users from reusing their current password when resetting.

## Consequences
- **Database Schema**: Added `reset_otp`, `reset_otp_expires_at`, `reset_otp_attempts`, and `locked_until` columns to the `users` table.
- **Improved UX**: Students get a friction-free login and can immediately browse books upon visiting the site.
- **Security**: Mitigated brute-force attacks on OTP via database-level rate limiting.
