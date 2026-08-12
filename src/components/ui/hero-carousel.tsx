"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useBanners } from "@/hooks/useBanners";

interface HeroSlide {
  id: number;
  imageUrl: string;
}

// P1: hero = elemen LCP. PNG asli (246–446 KB) dikonversi ke WebP (19–31 KB,
// turun ~93%) via sharp; PNG tetap disimpan untuk OG (kompat WebP OG tak merata)
// & fallback. Regenerasi bila ganti hero: sharp(png).webp({quality:80}).
const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    imageUrl: "/images/hero-1.webp",
  },
  {
    id: 2,
    imageUrl: "/images/hero-2.webp",
  },
  {
    id: 3,
    imageUrl: "/images/hero-3.webp",
  },
];

export default function HeroCarousel() {
  const { data: banners, isLoading } = useBanners('hero');
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Gunakan data dari backend, atau fallback ke slide default bila belum ada
  const slides = (banners && banners.length > 0) 
    ? banners.map(b => ({ id: b.id, imageUrl: b.image_url, linkUrl: b.link_url, title: b.title }))
    : HERO_SLIDES.map(s => ({ id: s.id.toString(), imageUrl: s.imageUrl, linkUrl: '', title: '' }));

  const goToNext = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const goToPrev = useCallback(() => {
    setCurrentSlide((prev) =>
      prev === 0 ? slides.length - 1 : prev - 1
    );
  }, [slides.length]);

  // Auto-slide every 5 seconds
  useEffect(() => {
    const timer = setInterval(goToNext, 5000);
    return () => clearInterval(timer);
  }, [goToNext]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  if (isLoading) {
    return (
      <div className="w-full bg-white flex justify-center h-full">
        <section className="relative w-full max-w-[1200px] h-[160px] sm:h-[240px] md:h-[320px] lg:h-[280px] xl:h-[300px] bg-brand-gray-100 lg:rounded-xl animate-pulse" />
      </div>
    );
  }

  if (slides.length === 0) return null;

  return (
    <div className="w-full bg-white flex justify-center h-full">
      <section className="relative w-full max-w-[1200px] h-[160px] sm:h-[240px] md:h-[320px] lg:h-[280px] xl:h-[300px] overflow-hidden bg-brand-gray-100 lg:rounded-xl">
      {/* Slides Container */}
      <div className="relative w-full h-full">
        {slides.map((slide, index) => {
          const content = (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
            >
              <Image
                src={slide.imageUrl}
                alt={slide.title || `Promosi layanan Posko Jasa ${index + 1}`}
                fill
                // object-cover dan object-center adalah kunci Safe Zone.
                // Memastikan bagian tengah gambar selalu aman walau rasio device berubah
                className="object-cover object-center" 
                priority={index === 0}
                fetchPriority={index === 0 ? "high" : undefined}
                sizes="(max-width: 1200px) 100vw, 1200px"
              />
            </div>
          );

          return slide.linkUrl ? (
            <a href={slide.linkUrl} key={slide.id} className="block w-full h-full" target="_blank" rel="noopener noreferrer">
              {content}
            </a>
          ) : content;
        })}
      </div>

      {/* Navigation Arrows - Higher z-index */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-40 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white transition-all flex items-center justify-center text-brand-gray-900 shadow-md"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-40 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white transition-all flex items-center justify-center text-brand-gray-900 shadow-md"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="absolute bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className="p-1.5 focus:outline-none" // padding untuk area klik yang lebih besar
                aria-label={`Go to slide ${index + 1}`}
              >
                <div
                  className={`h-[3px] rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? "w-6 sm:w-8 bg-brand-red"
                      : "w-3 sm:w-4 bg-white/60 hover:bg-white/90"
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
    </div>
  );
}
