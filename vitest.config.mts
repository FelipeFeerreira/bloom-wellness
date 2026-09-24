import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'vitest/config';

// Only the test database URL is taken from .env; everything else is stubbed per test.
process.env.TEST_DATABASE_URL ??= loadEnv({ quiet: true }).parsed?.TEST_DATABASE_URL;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // The real package throws outside a React Server environment.
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
