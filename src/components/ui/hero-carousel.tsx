"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HeroSlide {
  id: number;
  imageUrl: string;
}

// Place images in: /public/images/hero-1.png, hero-2.png, hero-3.png, etc.
const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    imageUrl: "/images/hero-1.png",
  },
  {
    id: 2,
    imageUrl: "/images/hero-2.png",
  },
  {
    id: 3,
    imageUrl: "/images/hero-3.png",
  },
];

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const goToNext = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  }, []);

  const goToPrev = useCallback(() => {
    setCurrentSlide((prev) =>
      prev === 0 ? HERO_SLIDES.length - 1 : prev - 1
    );
  }, []);

  // Auto-slide every 5 seconds
  useEffect(() => {
    const timer = setInterval(goToNext, 5000);
    return () => clearInterval(timer);
  }, [goToNext]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div className="w-full bg-white flex justify-center">
      <section className="relative w-full max-w-[1200px] h-[200px] sm:h-[280px] md:h-[350px] lg:h-[400px] overflow-hidden bg-[#e5e2e1] lg:mt-6 lg:rounded-xl">
      {/* Slides Container */}
      <div className="relative w-full h-full">
        {HERO_SLIDES.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            <Image
              src={slide.imageUrl}
              alt={`Hero slide ${index + 1}`}
              fill
              className="object-cover"
              priority={index === 0}
              sizes="100vw"
            />
          </div>
        ))}
      </div>

      {/* Navigation Arrows - Higher z-index */}
      <button
        onClick={goToPrev}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-40 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white transition-all flex items-center justify-center text-[#1c1b1b] shadow-md"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-40 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white transition-all flex items-center justify-center text-[#1c1b1b] shadow-md"
        aria-label="Next slide"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      <div className="absolute bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5">
        {HERO_SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className="p-1.5 focus:outline-none" // padding untuk area klik yang lebih besar
            aria-label={`Go to slide ${index + 1}`}
          >
            <div
              className={`h-[3px] rounded-[1px] transition-all duration-300 ${
                index === currentSlide
                  ? "w-6 sm:w-8 bg-[#b51822]"
                  : "w-3 sm:w-4 bg-white/60 hover:bg-white/90"
              }`}
            />
          </button>
        ))}
      </div>
    </section>
    </div>
  );
}
