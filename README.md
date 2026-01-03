# OpenList V3

A minimalist, production-ready todo list application optimized for mobile, iPad, and web with PostgreSQL sync and authentication.

## Features

- ✨ Sleek, intuitive user interface
- 📱 Mobile-first responsive design
- 💾 Local storage persistence with PostgreSQL sync
- 🔐 JWT-based authentication
- 🔄 Offline-first sync with conflict resolution
- ⚡ Fast and lightweight
- 🎨 Modern, minimalist design

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL 12+ (for backend)

### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (optional, defaults to `http://localhost:3001/api`):
```
VITE_API_URL=http://localhost:3001/api
```

3. Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Backend Setup

See [server/README.md](server/README.md) for detailed backend setup instructions.

Quick start:
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your database credentials
createdb openlist
psql openlist < db/schema.sql
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Local Storage** - Offline-first data persistence

### Backend
- **Fastify** - Fast web framework
- **PostgreSQL** - Database
- **JWT** - Authentication
- **TypeScript** - Type safety

## Architecture

The app uses an offline-first architecture:
- LocalStorage is the primary data store for immediate UI updates
- Changes are queued when offline and synced when online
- Last-write-wins conflict resolution based on timestamps
- Automatic background sync every 30 seconds when online
- Manual sync on login and when coming back online

## Design Philosophy

- Mobile-first approach
- Minimalist and clean interface
- Smooth animations and transitions
- Touch-optimized interactions
- Production-ready code quality
- Offline-first for reliability

