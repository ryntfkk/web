import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Test runner untuk `web/` (§14).
 *
 * Sengaja TANPA `@vitejs/plugin-react`: plugin itu menarik toolchain Babel yang
 * bentrok dengan versi @babel/core milik Next di repo ini. Transformasi JSX
 * diserahkan ke esbuild bawaan Vitest (`jsx: 'automatic'`), yang sudah cukup
 * untuk komponen — Fast Refresh memang tidak relevan di dalam test.
 */
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    // Cerminan `paths` di tsconfig. Kalau alias ini menyimpang, test gagal
    // dengan "cannot find module" yang tidak ada hubungannya dengan bug asli.
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Berkas Next (route, layout, page) bukan unit; jangan diseret masuk.
    exclude: ['node_modules', '.next', 'e2e'],
  },
});
