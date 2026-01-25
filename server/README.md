# OpenList V3 Server

Backend server for OpenList V3 with Fastify, PostgreSQL, and JWT authentication.

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm/yarn/pnpm

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update `.env` with your database connection and JWT secret:
```
DATABASE_URL=postgresql://user:password@localhost:5432/openlist
JWT_SECRET=your-secret-key-change-this-in-production
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Gmail OAuth (optional - for Gmail integration)
GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-client-secret
GMAIL_REDIRECT_URI=http://localhost:3001/api/gmail/oauth/callback
```

4. Create the database:
```bash
createdb openlist
```

5. Run the schema:
```bash
psql openlist < db/schema.sql
```

Or connect to PostgreSQL and run the SQL from `db/schema.sql`.

## Development

Run the server in development mode:
```bash
npm run dev
```

The server will start on `http://localhost:3001` (or the port specified in `.env`).

## Production

Build the TypeScript code:
```bash
npm run build
```

Start the server:
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token

### Todos
- `GET /api/todos` - Get all todos (requires authentication)
- `POST /api/todos/sync` - Sync todos with server (requires authentication)
- `PUT /api/todos/:id` - Update a todo (requires authentication)
- `DELETE /api/todos/:id` - Delete a todo (requires authentication)

### Tags
- `GET /api/tags` - Get all tags (requires authentication)
- `POST /api/tags` - Create a new tag (requires authentication)
- `PUT /api/tags/:id` - Update a tag (requires authentication)
- `DELETE /api/tags/:id` - Delete a tag (requires authentication)

### Gmail Integration
- `GET /api/gmail/oauth/authorize` - Start Gmail OAuth flow (requires authentication)
- `GET /api/gmail/oauth/callback` - OAuth callback endpoint
- `GET /api/gmail/status` - Check Gmail integration status (requires authentication)
- `DELETE /api/gmail/disconnect` - Disconnect Gmail integration (requires authentication)

### Health
- `GET /health` - Health check endpoint

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token signing
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:5173)
- `RENDER_SERVICE_URL` - (Optional) Render service URL for CORS in production

### Gmail OAuth (Optional)
- `GMAIL_CLIENT_ID` - Google OAuth Client ID from Google Cloud Console
- `GMAIL_CLIENT_SECRET` - Google OAuth Client Secret
- `GMAIL_REDIRECT_URI` - OAuth callback URL (e.g., http://localhost:3001/api/gmail/oauth/callback)

To set up Gmail OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Gmail API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs (e.g., http://localhost:3001/api/gmail/oauth/callback)
6. Copy the Client ID and Client Secret to your `.env` file

## Deployment to Render

See [DEPLOY.md](DEPLOY.md) for detailed step-by-step instructions on deploying to Render's free tier.

### Quick Summary

1. Create a PostgreSQL database on Render
2. Create a new Web Service on Render
3. Link the database to the web service
4. Configure environment variables in Render dashboard
5. Initialize the database using `db/init-render.sh`
6. Deploy and test

The `render.yaml` file in this directory can be used for automated setup, or you can manually create services through the Render dashboard.

