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

### Health
- `GET /health` - Health check endpoint

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token signing
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:5173)

