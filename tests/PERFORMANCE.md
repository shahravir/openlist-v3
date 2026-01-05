# E2E Test Performance Optimization Guide

## Summary of Optimizations

### 1. Playwright Configuration (`playwright.config.ts`)

#### ✅ Reduced Browser Projects
- **Before**: Running tests on 5 browsers (chromium, firefox, webkit, Mobile Chrome, Mobile Safari)
- **After**: Only chromium by default (others commented out for full testing when needed)
- **Impact**: ~5x faster for local development

#### ✅ Increased Workers
- **Before**: `workers: process.env.CI ? 1 : undefined` (sequential on CI)
- **After**: `workers: process.env.CI ? 2 : undefined` (parallel on CI)
- **Impact**: Tests run in parallel, significantly faster

#### ✅ Added Sharding Support
- Added shard configuration for CI to split tests across multiple machines
- **Usage**: Set `CI_SHARD` and `CI_SHARD_TOTAL` environment variables

#### ✅ Reduced Timeouts
- Web server timeout: 120s → 60s
- Added actionTimeout: 10s
- Added navigationTimeout: 30s

### 2. Wait Strategy Improvements

#### ❌ Problem: Excessive `waitForTimeout` Calls
- Found **151 instances** of `waitForTimeout` in tests
- Fixed delays (300ms, 500ms, 1000ms, 2000ms) add up significantly
- Example: If you have 50 tests with 500ms waits = 25 seconds wasted

#### ✅ Solution: Proper Wait Strategies
Added utility functions in `tests/utils/helpers.ts`:
- `waitForElement()` - Wait for elements to appear/disappear
- `waitForNetworkIdle()` - Wait for network requests to complete
- `waitForTodoCount()` - Wait for specific number of todos
- `waitForFormToClose()` - Wait for forms to close
- `waitForSyncComplete()` - Wait for sync operations

### 3. Best Practices

#### Replace Fixed Timeouts
```typescript
// ❌ BAD: Fixed timeout
await page.waitForTimeout(500);

// ✅ GOOD: Wait for actual condition
await page.waitForSelector('button[aria-label="Add new todo"]', { state: 'visible' });
```

#### Wait for Network Operations
```typescript
// ❌ BAD: Fixed timeout after API call
await page.click('button');
await page.waitForTimeout(1000);

// ✅ GOOD: Wait for network to be idle
await page.click('button');
await waitForNetworkIdle(page);
```

#### Wait for State Changes
```typescript
// ❌ BAD: Fixed timeout
await todoPage.addTodo('Task');
await page.waitForTimeout(500);

// ✅ GOOD: Wait for actual state
await todoPage.addTodo('Task');
await waitForTodoCount(page, 1);
```

## Remaining Work

### High Priority
1. **Replace remaining `waitForTimeout` calls** in:
   - `tests/integration.spec.ts` (~40 instances)
   - `tests/priorities.spec.ts` (~30 instances)
   - `tests/due-dates.spec.ts` (~20 instances)
   - `tests/pages/TodoPage.ts` (~15 instances)

2. **Use network response waiting** for API operations:
   ```typescript
   // Wait for specific API response
   const responsePromise = page.waitForResponse(resp => 
     resp.url().includes('/todos') && resp.request().method() === 'POST'
   );
   await todoPage.addTodo('Task');
   await responsePromise;
   ```

### Medium Priority
3. **Optimize test data setup**:
   - Use `test.beforeAll()` for shared setup when possible
   - Cache authentication tokens
   - Reuse test users across tests

4. **Add test grouping**:
   - Group related tests that can share setup
   - Use `test.describe.serial()` for tests that must run sequentially

5. **Database cleanup optimization**:
   - Use transactions for test isolation
   - Batch cleanup operations
   - Consider using test databases per worker

## Performance Metrics

### Expected Improvements
- **Local development**: ~5x faster (single browser vs 5 browsers)
- **CI execution**: ~2x faster (parallel workers)
- **Wait time reduction**: ~30-50% faster (replacing fixed timeouts)

### Running Tests

#### Local Development (Fast)
```bash
npm run test  # Only chromium, parallel workers
```

#### Full Browser Testing (Slower, Comprehensive)
Uncomment other browser projects in `playwright.config.ts`, then:
```bash
npm run test
```

#### CI with Sharding
```bash
# Machine 1
CI_SHARD=1 CI_SHARD_TOTAL=4 npm run test

# Machine 2
CI_SHARD=2 CI_SHARD_TOTAL=4 npm run test

# etc.
```

## Monitoring Performance

Track test execution time:
```bash
# Run with timing
time npm run test

# Or use Playwright's built-in timing
npm run test -- --reporter=list
```

## Additional Resources
- [Playwright Performance Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Parallel Execution](https://playwright.dev/docs/test-parallel)
- [Playwright Sharding](https://playwright.dev/docs/test-sharding)

