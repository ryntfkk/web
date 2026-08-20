'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Wrapper ringan: menampilkan children dengan animasi fade-in + slide-up
 * saat masuk viewport. Menggunakan IntersectionObserver . tidak ada library
 * animasi tambahan, tidak ada runtime cost sebelum elemen terlihat.
 *
 * Dipindahkan dari `app/jadi-mitra/AnimateOnScroll.tsx` ke sini saat halaman
 * /build lahir: dua landing memakai efek yang sama, dan salinan kedua pasti
 * menyimpang dari yang pertama (termasuk penanganan prefers-reduced-motion,
 * yang paling mudah terlupakan justru di salinan).
 */
export default function AnimateOnScroll({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Delay tambahan dalam ms . berguna untuk stagger antar-elemen. */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced-motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.opacity = '1';
      el.style.transform = 'none';
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
          }, delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: 0,
        transform: 'translateY(20px)',
        transition: 'opacity 0.55s ease-out, transform 0.55s ease-out',
      }}
    >
      {children}
    </div>
  );
}
