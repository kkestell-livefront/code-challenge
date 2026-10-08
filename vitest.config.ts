import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./setupTests.ts'],
    css: true,
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      exclude: [
        'node_modules/**',
        '.next/**',
        '**/vitest.config.*',
        '**/.eslintrc.*',
        '**/postcss.config.*',
        '**/next.config.*',

        // App router boilerplate
        'app/layout.tsx',
        'app/page.tsx',
        'app/api/**',
        'app/demo/**',

        // Misc
        'constants/**',
      ],
    },
  },
});
