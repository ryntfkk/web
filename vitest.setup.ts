import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Tanpa cleanup, komponen dari test sebelumnya tetap ada di document dan
// query berikutnya menemukan dua elemen . kegagalannya menuduh test yang salah.
afterEach(() => {
  cleanup();
});

// jsdom tidak punya matchMedia; komponen yang membacanya melempar saat render.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}
