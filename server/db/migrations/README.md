# Email Verification Migration

This migration adds email verification functionality to the OpenList application.

## What's Changed

### Database Schema
- Added `email_verified` column (BOOLEAN, default FALSE)
- Added `verification_token` column (VARCHAR(255), nullable)
- Added `verification_token_expires` column (TIMESTAMP WITH TIME ZONE, nullable)
- Added index on `verification_token` for faster lookups

### Backend Features
- Verification token generation on user registration
- Email sending service (logs to console in development)
- `/api/auth/verify-email` endpoint to verify email with token
- `/api/auth/resend-verification` endpoint to resend verification email
- Updated user queries to handle verification tokens

### Frontend Features
- EmailVerificationBanner component - shows reminder to verify email
- VerifyEmail page - handles email verification from link
- Updated App.tsx to show verification banner for unverified users
- API client methods for verification endpoints

## How to Apply Migration

### For Local Development

If you have a local PostgreSQL database:

```bash
# Navigate to server directory
cd server

# Apply the migration
psql openlist < db/migrations/005_add_email_verification.sql
```

Or manually run the SQL:
```sql
-- Connect to your database and run:
\i server/db/migrations/005_add_email_verification.sql
```

### For Render or Production

If using Render or another cloud service:

1. Connect to your database using psql or Render's Shell
2. Run the migration:
```bash
psql $DATABASE_URL < db/migrations/005_add_email_verification.sql
```

Or update your `init-render.sh` script to include migrations.

### For Fresh Setup

If setting up a fresh database, the columns are already included in `db/schema.sql`, so just run:
```bash
psql openlist < db/schema.sql
```

## Testing the Feature

1. Start the backend server:
```bash
cd server
npm run dev
```

2. Start the frontend:
```bash
npm run dev
```

3. Register a new user - you should see:
   - A verification email logged to the console (in development mode)
   - A blue verification banner on the main page
   - The banner should have a "Resend Email" button

4. Click the verification link (copy from console logs):
   - Should navigate to `/verify-email?token=...`
   - Should show success message
   - Should redirect to home page after 2 seconds

5. After verification:
   - The verification banner should disappear
   - The user's `email_verified` field should be TRUE in the database

## E2E Tests

Run the email verification tests:
```bash
npm run test:e2e tests/email-verification.spec.ts
```

## Production Considerations

For production, you'll need to:
1. Configure a real email service (SendGrid, AWS SES, Mailgun, etc.)
2. Update `server/utils/emailService.ts` to use the email service
3. Set `NODE_ENV=production` in environment variables
4. Configure `FRONTEND_URL` environment variable for verification links

## Security Notes

- Verification tokens expire after 24 hours
- Tokens are 64 hex characters (32 bytes of randomness)
- Tokens are hashed using crypto.randomBytes
- Users can still use the app with limited access before verification
