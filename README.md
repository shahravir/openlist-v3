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

## Testing

OpenList V3 has a comprehensive end-to-end test suite powered by Playwright, covering all critical user flows and ensuring quality across multiple browsers and devices.

### Running Tests

#### Run all E2E tests
```bash
npm run test:e2e
```

#### Run tests with UI mode (interactive)
```bash
npm run test:e2e:ui
```

#### Run tests in debug mode
```bash
npm run test:e2e:debug
```

#### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

#### View test report
```bash
npm run test:e2e:report
```

#### Generate tests using Codegen
```bash
npm run test:e2e:codegen
```

### Test Coverage

The E2E test suite covers:

- **Authentication**: Registration, login, logout, session persistence, protected routes
- **Todo CRUD**: Create, read, update, delete operations
- **Search & Filter**: Text search, status filters, keyboard shortcuts (Ctrl/Cmd+K)
- **Sync**: Real-time synchronization with server, offline support
- **Responsive Design**: Mobile, tablet, and desktop viewports
- **Accessibility**: Keyboard navigation, ARIA labels, focus management
- **Integration**: Complete user workflows and cross-feature interactions

### Test Structure

```
tests/
├── auth.spec.ts           # Authentication tests
├── todos.spec.ts          # Todo CRUD operations
├── search.spec.ts         # Search and filter functionality
├── sync.spec.ts           # Synchronization tests
├── responsive.spec.ts     # Responsive design tests
├── accessibility.spec.ts  # Accessibility tests
├── integration.spec.ts    # End-to-end integration tests
├── pages/                 # Page Object Models
│   ├── BasePage.ts
│   ├── LoginPage.ts
│   ├── RegisterPage.ts
│   └── TodoPage.ts
├── fixtures/              # Test data and fixtures
│   ├── test-user.ts
│   └── test-data.ts
└── utils/                 # Test utilities
    ├── helpers.ts
    └── assertions.ts
```

### Browser Support

Tests run on:
- Chromium (Desktop & Mobile Chrome)
- Firefox (Desktop)
- WebKit (Desktop Safari & Mobile Safari)

### CI/CD Integration

E2E tests run automatically on:
- Pull requests to `main`
- Pushes to `main`
- Manual workflow dispatch

Test results and screenshots are uploaded as artifacts for debugging failures.

### Writing New Tests

1. Create test files in the `tests/` directory with `.spec.ts` extension
2. Use Page Object Models for interacting with pages
3. Use custom assertions from `tests/utils/assertions.ts`
4. Use helper functions from `tests/utils/helpers.ts`
5. Follow existing test patterns for consistency

Example:
```typescript
import { test, expect } from '@playwright/test';
import { TodoPage } from './pages/TodoPage';
import { createTestUser } from './fixtures/test-user';
import { setupAuthenticatedSession } from './utils/helpers';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    const testUser = createTestUser();
    await setupAuthenticatedSession(page, testUser);
  });

  test('my test case', async ({ page }) => {
    const todoPage = new TodoPage(page);
    await todoPage.addTodo('Test task');
    // Add assertions
  });
});
```

### Debugging Tests

1. **Interactive Mode**: Use `npm run test:e2e:ui` to step through tests
2. **Debug Mode**: Use `npm run test:e2e:debug` to debug with DevTools
3. **Screenshots**: Failed tests automatically capture screenshots
4. **Videos**: Failed tests record videos (in CI)
5. **Traces**: View detailed traces in Playwright Trace Viewer

### Performance

- Tests run in parallel for faster execution
- Average test suite execution time: ~5-8 minutes (all browsers)
- Retry mechanism for flaky tests (2 retries in CI)
- Optimized selectors and wait strategies

