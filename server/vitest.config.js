import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup.js'],
    include: ['test/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/**/*.js'],
      // Excluded: the AWS/IO seams and dev-only scripts that are only
      // meaningfully exercised against real infrastructure. dynamodb.js is the
      // boundary every test mocks, so running it here would prove nothing.
      exclude: ['src/db/dynamodb.js', 'src/db/seed-dynamodb.js', 'src/db/wipe-dynamodb.js', 'src/index.js'],
      // Honest floors that ratchet against regression — not a vanity 100%.
      // Branches sit lower because much of the untested remainder is defensive
      // error-handling (catch blocks, optional-chaining fallbacks).
      thresholds: { lines: 65, statements: 65, functions: 55, branches: 48 },
    },
  },
});
