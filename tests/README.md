# E2E Testing Guide

## Prerequisites

Before running E2E tests, you need:

1. **Backend server running** on `http://localhost:3001`
   ```bash
   cd server
   npm install
   # Make sure you have a .env file with database connection
   npm run dev
   ```

2. **Frontend server** - Playwright will start this automatically, but you can also run it manually:
   ```bash
   npm run dev
   ```

3. **Database** - PostgreSQL database should be set up and running
   ```bash
   # Create database
   createdb openlist
   
   # Run schema
   psql openlist < server/db/schema.sql
   ```

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run specific test file
```bash
npx playwright test tests/auth.spec.ts
```

### Run in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run in debug mode
```bash
npm run test:e2e:debug
```

### Run specific browser
```bash
npx playwright test --project=chromium
```

## Test Structure

- `tests/auth.spec.ts` - Authentication tests
- `tests/todos.spec.ts` - Todo CRUD operations
- `tests/search.spec.ts` - Search and filter functionality
- `tests/sync.spec.ts` - Sync functionality
- `tests/responsive.spec.ts` - Responsive design tests
- `tests/accessibility.spec.ts` - Accessibility tests
- `tests/integration.spec.ts` - End-to-end user flows

## Common Issues

### Backend Server Not Running
**Error:** `Network Error` or `Registration failed: Network Error`

**Solution:** Start the backend server:
```bash
cd server && npm run dev
```

### Database Not Set Up
**Error:** Database connection errors in backend logs

**Solution:** Set up the database:
```bash
createdb openlist
psql openlist < server/db/schema.sql
```

### Tests Timing Out
**Error:** `TimeoutError: page.waitForSelector`

**Possible causes:**
- Backend server not responding
- Frontend server not ready
- Network issues
- Selectors changed in code

**Solution:**
- Check that both servers are running
- Increase timeout if needed
- Check selectors match current code

### localStorage SecurityError
**Error:** `SecurityError: Failed to read the 'localStorage' property`

**Solution:** This is fixed in the helpers - the page now navigates before accessing localStorage.

## Test Data

Tests use unique test users generated per test run to avoid conflicts. Each test:
- Creates a new user with unique email
- Clears localStorage before starting
- Cleans up after completion

## Writing New Tests

1. Use Page Object Model pattern (see `tests/pages/`)
2. Use helper functions from `tests/utils/helpers.ts`
3. Use assertions from `tests/utils/assertions.ts`
4. Follow existing test structure
5. Add data-testid attributes to new components for reliable selectors

## Debugging Failed Tests

1. **Check screenshots:** Failed tests save screenshots in `test-results/`
2. **Check videos:** Failed tests save videos in `test-results/`
3. **Use UI mode:** `npm run test:e2e:ui` for interactive debugging
4. **Use debug mode:** `npm run test:e2e:debug` to step through tests
5. **Check console logs:** Tests log helpful debug information

## CI/CD

Tests run automatically on:
- Pull requests
- Main branch pushes

Make sure backend server is available in CI environment.
