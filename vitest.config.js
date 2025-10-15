import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    watch: false,
    environment: 'node',
    watchExclude: ['**/node_modules/**', '**/dist/**', '**/out/**'],
    pool: 'threads'
  }
});
