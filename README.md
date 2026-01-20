# OpenList V3

A minimalist, production-ready todo list application optimized for mobile, iPad, and web with PostgreSQL sync and authentication.

## Features

- ✨ Sleek, intuitive user interface
- 📱 Mobile-first responsive design
- 💾 Local storage persistence with PostgreSQL sync
- 🔐 JWT-based authentication with password reset
- 🔄 Offline-first sync with conflict resolution
- 🎯 Drag & drop todo reordering with keyboard accessibility
- 📅 **Due dates with natural language parsing** (new!)
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

2. Create a `.env` file (optional for local development):
```
# Backend API URL (required for production deployments like Vercel)
# For local development, defaults to http://localhost:3001/api if not set
VITE_API_URL=http://localhost:3001/api

# WebSocket URL (optional - auto-derived from VITE_API_URL if not set)
# Only set this if your WebSocket endpoint is different
# VITE_WS_URL=ws://localhost:3001/ws
```

**Environment Variable Priority:**
- `VITE_API_URL` - Backend API URL (highest priority, recommended for all deployments)
- `VITE_WS_URL` - WebSocket URL (optional, auto-derived from API URL if not set)
- If `VITE_API_URL` is not set:
  - Development mode: defaults to `http://localhost:3001/api`
  - Production mode: falls back to `https://openlist-v3-server.onrender.com/api`

**For Production Deployments (e.g., Vercel):**
Always set `VITE_API_URL` in your deployment platform's environment variables to point to your backend API.

3. Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Authentication & Password Reset

OpenList V3 includes a full authentication system with secure password reset functionality:

### Features
- **JWT-based Authentication**: Secure token-based authentication
- **Password Reset**: Users can reset forgotten passwords via email
- **Rate Limiting**: Protects against abuse (3 attempts per hour per email)
- **Token Expiration**: Reset tokens expire after 1 hour for security
- **Email Notifications**: Beautiful, responsive HTML emails
- **Development Mode**: Emails logged to console when email service not configured

### Email Configuration (Backend)

To enable password reset emails, configure the following environment variables in your `server/.env` file:

```bash
# Email Service Configuration
EMAIL_HOST=smtp.gmail.com           # SMTP server hostname
EMAIL_PORT=587                      # SMTP port (587 for TLS, 465 for SSL)
EMAIL_SECURE=false                  # Use SSL (true for port 465, false for 587)
EMAIL_USER=your-email@gmail.com     # SMTP username
EMAIL_PASS=your-app-password        # SMTP password or app-specific password
EMAIL_FROM=noreply@openlist.app     # From address for emails

# Application URL (for reset links)
APP_URL=http://localhost:5173       # Frontend URL for password reset links
```

**Note**: If email configuration is not provided, emails will be logged to the console in development mode. This is useful for testing without setting up an email service.

### Supported Email Providers

- **Gmail**: Use app-specific password, not your regular password
- **SendGrid**: Use API key as password
- **AWS SES**: Configure SMTP credentials
- **Mailgun**: Use SMTP credentials
- **Any SMTP Server**: Standard SMTP configuration

### Gmail Setup Example

1. Enable 2-Factor Authentication on your Google Account
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. Use the generated password in `EMAIL_PASS`

### Password Reset Flow

1. User clicks "Forgot password?" on login page
2. User enters their email address
3. System sends email with reset link (if account exists)
4. User clicks link in email (valid for 1 hour)
5. User enters new password
6. User can log in with new password

### Security Features

- **Rate Limiting**: Maximum 3 password reset requests per hour per email
- **Token Security**: Cryptographically secure random tokens
- **One-time Use**: Tokens are marked as used after password reset
- **Expiration**: Tokens expire after 1 hour
- **No Email Enumeration**: Same response whether email exists or not

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
- **@dnd-kit** - Drag and drop functionality
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
- Todo order is persisted and synced across devices

## Design Philosophy

- Mobile-first approach
- Minimalist and clean interface
- Smooth animations and transitions
- Touch-optimized interactions
- Production-ready code quality
- Offline-first for reliability

## Drag & Drop Reordering

OpenList V3 includes a fully accessible drag-and-drop reordering system that works seamlessly across devices:

### Features
- **Drag Handle**: Touch and mouse-friendly drag handles on each todo item
- **Visual Feedback**: Real-time visual feedback during dragging with overlay effects
- **Haptic Feedback**: Tactile feedback on mobile devices when dragging starts/ends
- **Keyboard Accessibility**: Up/down arrow buttons for users who prefer keyboard navigation
- **Disabled States**: Appropriate button states (e.g., up button disabled on first item)
- **Persistence**: Order is saved locally and synced to the server
- **Cross-Device Sync**: Order changes sync across all your devices in real-time
- **Responsive**: Works on all screen sizes (mobile, tablet, desktop)

### How to Use
1. **Drag & Drop**: Click and hold the drag handle (☰ icon) and drag the todo to a new position
2. **Keyboard**: Use the up/down arrow buttons visible on each todo item
3. **Mobile**: Touch and drag the drag handle to reorder on touch devices

### Implementation Details
- Built with [@dnd-kit](https://dndkit.com/) for accessibility and performance
- Order field stored in database with efficient indexing
- Optimistic UI updates with background sync
- Conflict resolution using last-write-wins strategy

## Due Dates

OpenList V3 includes an intelligent due date system with natural language parsing, making it easy to schedule tasks:

### Features
- **Natural Language Parsing**: Just type dates naturally in your task text
  - Relative dates: "tomorrow", "today", "next week", "next month", "next year"
  - Absolute dates: "26 jan 2026", "jan 26", "26/01/2026", "2026-01-26"
  - Common formats: "Jan 26", "January 26", "26 Jan", "26 January"
- **Auto-detection**: Dates are automatically detected and removed from task text
- **Date Preview**: See the detected date before adding the task (can be removed if incorrect)
- **Visual Indicators**: Color-coded badges show due date status
  - Red: Overdue tasks
  - Yellow: Due today
  - Blue: Upcoming tasks
- **Smart Filters**: Filter tasks by due date in the sidebar
  - Overdue: Tasks past their due date
  - Today: Tasks due today
  - This Week: Tasks due this week (excluding today)
  - Upcoming: All future tasks
  - No Date: Tasks without a due date
- **Date Picker**: Manual date selection with quick actions (Today, Tomorrow, Next Week)
- **Responsive**: Native date picker on mobile, styled picker on desktop
- **Accessible**: Full keyboard navigation and screen reader support

### How to Use
1. **Natural Language**: Type "Buy groceries tomorrow" and the date is automatically detected
2. **Manual Selection**: Double-click a task, click the calendar icon, and select a date
3. **Filtering**: Open the sidebar and click on date filter buttons
4. **Editing**: Change dates anytime by editing the task

### Implementation Details
- Due dates stored as timestamps for consistency with other dates
- Indexed database queries for efficient filtering
- Syncs across all devices in real-time
- Offline-first with conflict resolution

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
- **Todo Reordering**: Drag-and-drop reordering, keyboard-based reordering (up/down buttons)
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
├── reorder.spec.ts        # Drag-and-drop reordering tests
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

