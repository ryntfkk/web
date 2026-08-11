import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Test runner untuk `web/` (§14).
 *
 * Sengaja TANPA `@vitejs/plugin-react`: plugin itu menarik toolchain Babel yang
 * bentrok dengan versi @babel/core milik Next di repo ini. Transformasi JSX
 * diserahkan ke esbuild bawaan Vitest (`jsx: 'automatic'`), yang sudah cukup
 * untuk komponen . Fast Refresh memang tidak relevan di dalam test.
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
    /**
     * 20 detik, bukan 5 detik bawaan.
     *
     * Ini bukan karena ada test yang lambat . `mitra/schedule/page.test.tsx`
     * selesai dalam ~0,6 detik bila dijalankan sendirian. Tetapi saat 25+
     * berkas ber-jsdom berjalan paralel, satu-dua di antaranya melewati 5
     * detik dan GAGAL secara acak.
     *
     * Sebelum suite ini dipasang sebagai gerbang deploy (amplify.yml), batas
     * itu harus longgar: gerbang yang merah secara acak mengajari orang
     * mengabaikan CI, dan itu lebih buruk daripada tidak punya gerbang.
     */
    testTimeout: 20000,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Berkas Next (route, layout, page) bukan unit; jangan diseret masuk.
    exclude: ['node_modules', '.next', 'e2e'],
  },
});
