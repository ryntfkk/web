"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useBanners } from "@/hooks/useBanners";

export default function SecondaryBannerCarousel() {
  const { data: banners, isLoading } = useBanners('secondary');
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = (banners && banners.length > 0) 
    ? banners.map(b => ({ id: b.id, imageUrl: b.image_url, linkUrl: b.link_url, title: b.title }))
    : [];

  const goToNext = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const goToPrev = useCallback(() => {
    setCurrentSlide((prev) =>
      prev === 0 ? slides.length - 1 : prev - 1
    );
  }, [slides.length]);

  // Auto-slide every 6 seconds to offset from main hero
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(goToNext, 6000);
    return () => clearInterval(timer);
  }, [goToNext, slides.length]);

  if (isLoading) {
    return (
      <div className="w-full bg-white flex justify-center py-6">
        <div className="w-full max-w-[1200px] aspect-[21/9] max-h-[140px] sm:max-h-[200px] md:max-h-[260px] bg-brand-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  // Hide entirely if no secondary banners are active
  if (slides.length === 0) return null;

  return (
    <div className="w-full flex justify-center">
      <section className="relative w-full max-w-[1200px] aspect-[21/9] max-h-[140px] sm:max-h-[200px] md:max-h-[260px] overflow-hidden rounded-lg bg-brand-gray-100 shadow-sm border border-brand-gray-200/60">
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
                  alt={slide.title || `Promosi ${index + 1}`}
                  fill
                  className="object-cover object-center" 
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

        {slides.length > 1 && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-40 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/80 hover:bg-white transition-all flex items-center justify-center text-brand-gray-900 shadow-md"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-40 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/80 hover:bg-white transition-all flex items-center justify-center text-brand-gray-900 shadow-md"
              aria-label="Next slide"
            >
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </>
        )}
      </section>
    </div>
  );
}
