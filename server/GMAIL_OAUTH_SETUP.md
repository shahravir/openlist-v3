# Gmail OAuth Setup and Testing Guide

This guide explains how to set up Gmail OAuth integration and test the implementation.

## Table of Contents
- [Google Cloud Console Setup](#google-cloud-console-setup)
- [Backend Configuration](#backend-configuration)
- [Testing the Integration](#testing-the-integration)
- [Troubleshooting](#troubleshooting)

---

## Google Cloud Console Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click **"New Project"**
4. Enter a project name (e.g., "OpenList Gmail Integration")
5. Click **"Create"**
6. Wait for the project to be created and select it

### Step 2: Enable Gmail API

1. In your project, go to **"APIs & Services"** > **"Library"**
2. Search for **"Gmail API"**
3. Click on **"Gmail API"**
4. Click **"Enable"**
5. Wait for the API to be enabled

### Step 3: Configure OAuth Consent Screen

**Important:** Google has reorganized the OAuth setup interface. The user type selection is now in a separate **Audience** page, not in the OAuth consent screen itself.

1. **Set User Type (Audience):**
   - Navigate to **"Google Auth Platform"** > **"Audience"** (or go directly to: `https://console.developers.google.com/auth/audience`)
   - Under **"User Type"**, select **"External"** (unless you have a Google Workspace organization)
   - **External** means your app is available to any user with a Google Account
   - **Internal** is only available if your project is associated with a Google Cloud Organization
   - Click **"Save"**

2. **Configure OAuth Consent Screen:**
   - Go to **"APIs & Services"** > **"OAuth consent screen"** (or **"Google Auth Platform"** > **"Branding"**)
   - If this is your first time, click **"Create"** or **"Continue"**

**App Information:**
- **App name**: OpenList (or your app name)
- **User support email**: Your email address
- **App logo**: (Optional) Upload your app logo
- **Application home page**: `http://localhost:5173` (for development)
- **Application privacy policy link**: (Optional for testing)
- **Application terms of service link**: (Optional for testing)

**Developer contact information:**
- Add your email address

4. Click **"Save and Continue"**

**Scopes:**
1. Click **"Add or Remove Scopes"**
2. Search for "Gmail API"
3. Select the following scope:
   - `https://www.googleapis.com/auth/gmail.readonly`
4. Click **"Update"**
5. Click **"Save and Continue"**

**Test users:** (for development)
1. Click **"Add Users"**
2. Add your Gmail address (the one you'll use for testing)
3. Click **"Add"**
4. Click **"Save and Continue"**

5. Review the summary and click **"Back to Dashboard"**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"Create Credentials"** > **"OAuth client ID"**
3. Choose **"Web application"** as the application type
4. Enter a name (e.g., "OpenList Web Client")

**Authorized JavaScript origins:**
- Add: `http://localhost:5173` (for frontend development)
- Add: `http://localhost:3001` (for backend development)
- For production, add your actual domain (e.g., `https://your-app.vercel.app`)

**Authorized redirect URIs:**
- Add: `http://localhost:3001/api/gmail/oauth/callback` (for development)
- For production, add your actual backend URL (e.g., `https://your-api.onrender.com/api/gmail/oauth/callback`)

5. Click **"Create"**
6. A dialog will appear with your **Client ID** and **Client Secret**
7. **Copy both values** - you'll need them for configuration

---

## Backend Configuration

### Step 1: Update Environment Variables

1. Copy the example environment file:
```bash
cd server
cp .env.example .env
```

2. Edit `.env` and add your OAuth credentials:
```env
# Database and JWT (existing)
DATABASE_URL=postgresql://localhost:5432/openlist
JWT_SECRET=your-secret-key-change-this-in-production
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Gmail OAuth Configuration
GMAIL_CLIENT_ID=your-client-id-from-google-console.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret-from-google-console
GMAIL_REDIRECT_URI=http://localhost:3001/api/gmail/oauth/callback
```

**Important Notes:**
- Replace `your-client-id-from-google-console` with your actual Client ID
- Replace `your-client-secret-from-google-console` with your actual Client Secret
- The `GMAIL_REDIRECT_URI` must **exactly match** one of the redirect URIs you added in Google Cloud Console
- For production, update all URLs to your production domains

### Step 2: Install Dependencies (if not already done)

```bash
cd server
npm install
```

This installs:
- `googleapis` - Google API client library
- `@fastify/rate-limit` - Rate limiting for security

### Step 3: Start the Backend Server

```bash
npm run dev
```

The server should start on `http://localhost:3001` (or the port specified in your `.env`)

You should see logs indicating:
```
Server listening on http://localhost:3001
```

If environment variables are missing, you'll see an error:
```
Error: GMAIL_CLIENT_ID environment variable is required for Gmail OAuth
```

---

## Testing the Integration

### Option 1: Using cURL (Command Line)

#### 1. Get JWT Token

First, register or login to get a JWT token:

**Register:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the `token` from the response. Example response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "test@example.com"
  }
}
```

#### 2. Check Gmail Status (Before Connection)

```bash
curl -X GET http://localhost:3001/api/gmail/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response:
```json
{
  "connected": false
}
```

#### 3. Initiate OAuth Flow

**Important:** This step must be done in a web browser, not cURL.

1. Open your browser
2. Navigate to: `http://localhost:3001/api/gmail/oauth/authorize`
3. Make sure you're logged in (include your JWT token in localStorage or as a cookie)

**Alternative:** Get the authorization URL via browser console:
```bash
# This will return a redirect, so use -v to see the Location header
curl -v -X GET http://localhost:3001/api/gmail/oauth/authorize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Copy the redirect URL from the `Location:` header and open it in your browser.

#### 4. Complete OAuth Flow in Browser

1. You'll be redirected to Google's consent screen
2. Sign in with your Google account (must be added as a test user)
3. Grant permission to read Gmail
4. You'll be redirected back to `http://localhost:5173/settings?gmail_success=true`

#### 5. Check Gmail Status (After Connection)

```bash
curl -X GET http://localhost:3001/api/gmail/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response:
```json
{
  "connected": true,
  "email": "your-gmail@gmail.com"
}
```

#### 6. Disconnect Gmail

```bash
curl -X DELETE http://localhost:3001/api/gmail/disconnect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "message": "Gmail integration disconnected"
}
```

### Option 2: Using Postman

1. **Import Collection**: Create a new collection in Postman

2. **Set Variables**:
   - `baseUrl`: `http://localhost:3001`
   - `token`: (Will be set after login)

3. **Create Requests**:

   **A. Register/Login:**
   - Method: `POST`
   - URL: `{{baseUrl}}/api/auth/login`
   - Body (JSON):
     ```json
     {
       "email": "test@example.com",
       "password": "password123"
     }
     ```
   - Save the `token` from response to the `token` variable

   **B. Check Gmail Status:**
   - Method: `GET`
   - URL: `{{baseUrl}}/api/gmail/status`
   - Headers: `Authorization: Bearer {{token}}`

   **C. Start OAuth (Copy URL to Browser):**
   - Method: `GET`
   - URL: `{{baseUrl}}/api/gmail/oauth/authorize`
   - Headers: `Authorization: Bearer {{token}}`
   - This will return a redirect - copy the URL and paste in browser

   **D. Disconnect Gmail:**
   - Method: `DELETE`
   - URL: `{{baseUrl}}/api/gmail/disconnect`
   - Headers: `Authorization: Bearer {{token}}`

### Option 3: Frontend Integration (Recommended)

If you have a frontend UI for settings:

1. **Start Both Servers:**
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd ..
npm run dev
```

2. **Login to Your App:**
   - Go to `http://localhost:5173`
   - Login with your credentials

3. **Navigate to Settings:**
   - Go to settings page (if implemented)
   - Look for "Connect Gmail" button
   - Click to start OAuth flow

4. **Complete OAuth:**
   - You'll be redirected to Google
   - Grant permissions
   - You'll be redirected back with success message

5. **Verify Connection:**
   - Check that your Gmail email is displayed
   - Try disconnecting

---

## Testing Rate Limiting

The OAuth endpoints are rate-limited for security:

### Test Authorization Rate Limit (5 requests/minute)

```bash
# Run this 6 times quickly
for i in {1..6}; do
  echo "Request $i:"
  curl -X GET http://localhost:3001/api/gmail/oauth/authorize \
    -H "Authorization: Bearer YOUR_JWT_TOKEN"
  echo ""
done
```

The 6th request should return a rate limit error (429 status).

### Test Callback Rate Limit (10 requests/minute)

```bash
# Run this 11 times quickly
for i in {1..11}; do
  echo "Request $i:"
  curl -X GET "http://localhost:3001/api/gmail/oauth/callback?code=test&state=test"
  echo ""
done
```

The 11th request should return a rate limit error (429 status).

---

## Troubleshooting

### Issue: "GMAIL_CLIENT_ID environment variable is required"

**Solution:** 
- Make sure `.env` file exists in the `server/` directory
- Verify `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REDIRECT_URI` are set
- Restart the server after updating `.env`

### Issue: "Access blocked: This app's request is invalid"

**Solution:**
- Verify redirect URI in Google Console matches exactly: `http://localhost:3001/api/gmail/oauth/callback`
- Check that Gmail API is enabled
- Make sure OAuth consent screen is configured

### Issue: "Error 401: invalid_client"

**Solution:**
- Verify Client ID and Client Secret are correct
- Check for extra spaces or newlines in `.env` file
- Regenerate credentials in Google Console if needed

### Issue: "Error 403: access_denied" or "This app is blocked"

**Solution:**
- Add your Gmail account as a test user in OAuth consent screen
- If using Google Workspace, contact your admin
- Wait a few minutes after adding test user (propagation delay)

### Issue: Redirected to `/settings?gmail_error=invalid_state`

**Solution:**
- State tokens expire after 10 minutes
- Don't refresh or navigate away during OAuth flow
- Complete the flow within 10 minutes of clicking "Connect"
- If in development with multiple server instances, use Redis for state storage

### Issue: "No Gmail integration found" when disconnecting

**Solution:**
- Check that you completed the OAuth flow successfully
- Verify token is stored in database: 
  ```sql
  SELECT * FROM gmail_integrations WHERE user_id = 'your-user-id';
  ```
- Make sure you're using the correct JWT token

### Issue: Rate limit errors during testing

**Solution:**
- Wait 1 minute before retrying
- For development, you can temporarily increase limits in `server/routes/gmail.ts`
- Remember to restore production limits before deploying

### Issue: Can't find "External" user type in OAuth consent screen

**Solution:**
- Google has moved the user type selection to a separate page. The **"External"** option is no longer in the OAuth consent screen setup.
- **Correct location:** Navigate to **"Google Auth Platform"** > **"Audience"** (or go to: `https://console.developers.google.com/auth/audience`)
- On the Audience page, you'll see **"User Type"** with two options:
  - **External**: Available to any user with a Google Account (choose this for most apps)
  - **Internal**: Only available if your project is in a Google Cloud Organization
- Select **"External"** and click **"Save"**, then return to the OAuth consent screen to continue configuration

---

## Database Verification

### Check Stored Tokens

```sql
-- Connect to your database
psql openlist

-- View all Gmail integrations
SELECT id, user_id, email, is_active, created_at, updated_at 
FROM gmail_integrations;

-- View specific user's integration
SELECT * FROM gmail_integrations 
WHERE user_id = 'your-user-id';
```

### Manually Delete Integration (for testing)

```sql
DELETE FROM gmail_integrations WHERE user_id = 'your-user-id';
```

---

## Production Deployment

When deploying to production:

1. **Update Google Cloud Console:**
   - Add production domains to Authorized JavaScript origins
   - Add production callback URL to Authorized redirect URIs
   - Example: `https://your-api.onrender.com/api/gmail/oauth/callback`

2. **Update Environment Variables:**
   - Set `GMAIL_REDIRECT_URI` to production callback URL
   - Set `FRONTEND_URL` to production frontend URL
   - Keep `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` secure

3. **Publish OAuth App:**
   - In Google Cloud Console, go to OAuth consent screen
   - Click "Publish App" to remove "Testing" mode
   - This allows any Google user to connect (not just test users)

4. **Security Considerations:**
   - Use HTTPS for all production URLs
   - Store tokens securely (consider encryption)
   - Monitor rate limits and adjust if needed
   - For multi-instance deployments, use Redis for state storage

---

## Support

If you encounter issues not covered here:

1. Check server logs: `server` terminal will show detailed error messages
2. Check browser console: Look for network errors or redirects
3. Verify Google Cloud Console configuration
4. Test with a fresh OAuth flow (disconnect and reconnect)

For more information:
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Fastify Rate Limit Plugin](https://github.com/fastify/fastify-rate-limit)
