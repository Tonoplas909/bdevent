import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const domain = fileURLToPath(new URL('./supabase/functions/_shared/domain', import.meta.url));

export default defineConfig({
  resolve: { alias: { '@domain': domain } },
  test: {
    globals: true,
    include: ['src/**/*.test.{js,jsx}', 'supabase/functions/**/*.test.js', 'scripts/**/*.test.mjs'],
    setupFiles: ['vitest.setup.js'],
  },
});
