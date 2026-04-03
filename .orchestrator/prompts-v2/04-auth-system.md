Read the entire src/ directory before making any changes.

## TASK: Email verification, password reset, and auth improvements

### PART 1: EMAIL VERIFICATION
After signup, redirect to "Check your email" page (src/app/verify-email/page.tsx).
Include "Resend verification email" button.
Add callback route: src/app/auth/callback/route.ts to handle verification redirect.
Exchange code for session, redirect to /dashboard on success.

### PART 2: PASSWORD RESET
Add "Forgot Password?" link on login page.
Create /forgot-password page: email input, calls supabase.auth.resetPasswordForEmail().
Show generic message: "If an account exists, we've sent a reset link."
Create /reset-password page: new password + confirm fields, strength meter.
On submit: supabase.auth.updateUser({ password }).
Redirect to /dashboard on success.

### PART 3: CHANGE PASSWORD IN SETTINGS
Add "Change Password" section in settings:
- Current Password field (for UX trust)
- New Password + Confirm fields
- Min 8 chars, strength meter
- Success/error toast

### PART 4: GOOGLE OAUTH
Add "Continue with Google" button on login/signup:
supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: origin + '/auth/callback' } })

### SECURITY (NIST SP 800-63B):
- Min 8 chars, no forced complexity rules
- No periodic forced resets
- Generic error messages to prevent user enumeration
- Rate limiting handled by Supabase built-in

Run npx next build to verify. Fix any errors.
