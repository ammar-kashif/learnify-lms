'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Testimonial {
  name: string;
  image: string;
}

const testimonials: Testimonial[] = [
  { name: 'Abdullah', image: '/images/testimonials/Abdullah review post.png' },
  { name: 'Ali', image: '/images/testimonials/Ali review.png' },
  { name: 'Ansha', image: '/images/testimonials/Ansha Review post.png' },
  { name: 'Ayaan', image: '/images/testimonials/Ayaan review post.png' },
  { name: 'Faizaan', image: '/images/testimonials/Faizaan review post.png' },
  { name: 'Fatima', image: '/images/testimonials/Fatima review.png' },
  { name: 'Jannat', image: '/images/testimonials/Jannat review post.png' },
  { name: 'Mahnoor', image: '/images/testimonials/Mahnoor Review post.png' },
  { name: 'Mahrukh', image: '/images/testimonials/Mahrukh review post.png' },
];

export default function Testimonials() {
  const [active, setActive] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const total = testimonials.length;

  const goTo = useCallback(
    (index: number) => {
      if (isAnimating) return;
      setIsAnimating(true);
      setActive(index);
      setTimeout(() => setIsAnimating(false), 400);
    },
    [isAnimating]
  );

  const next = useCallback(() => {
    goTo((active + 1) % total);
  }, [active, total, goTo]);

  const prev = useCallback(() => {
    goTo((active - 1 + total) % total);
  }, [active, total, goTo]);

  // Auto-advance every 4 seconds
  useEffect(() => {
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next]);

  // Close lightbox on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Get visible cards: previous, active, next
  const getIndex = (offset: number) =>
    (active + offset + total) % total;

  return (
    <section id="testimonials" className="relative px-4 py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-primary/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(223,102,57,0.08),transparent_60%)]" />

      {/* Decorative blobs */}
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-purple-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-14 text-center">
          <div className="mb-4 inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary dark:bg-primary/20">
            <Sparkles className="mr-2 h-4 w-4" />
            What Our Students Say
          </div>
          <h2 className="mb-4 text-4xl font-bold text-gray-900 dark:text-gray-100">
            Loved by{' '}
            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Learners
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            Don&apos;t just take our word for it — hear from the amazing students
            who learn with Learnify every day.
          </p>
        </div>

        {/* ===== Carousel (3-card view on desktop, 1-card on mobile) ===== */}
        <div className="relative">
          {/* Left Arrow */}
          <Button
            variant="outline"
            size="icon"
            onClick={prev}
            className="absolute -left-2 top-1/2 z-20 h-11 w-11 -translate-y-1/2 rounded-full border-gray-200 bg-white/90 text-gray-600 shadow-lg backdrop-blur-sm transition-all hover:border-primary hover:bg-primary hover:text-white dark:border-gray-600 dark:bg-gray-800/90 dark:text-gray-300 dark:hover:border-primary dark:hover:bg-primary dark:hover:text-white sm:-left-5"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          {/* Cards Container */}
          <div
            ref={scrollRef}
            className="flex items-center justify-center gap-4 sm:gap-6 overflow-hidden px-8 sm:px-12"
          >
            {/* Previous card (hidden on mobile) */}
            <div
              role="button"
              tabIndex={0}
              className="hidden md:block w-64 lg:w-72 flex-shrink-0 cursor-pointer transition-all duration-500 ease-out"
              onClick={() => goTo(getIndex(-1))}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') goTo(getIndex(-1)); }}
              aria-label={`View ${testimonials[getIndex(-1)].name}'s testimonial`}
            >
              <div className="group relative overflow-hidden rounded-2xl border-2 border-gray-200/50 shadow-md transition-all duration-300 hover:shadow-xl hover:border-primary/30 dark:border-gray-700/50 opacity-60 hover:opacity-80 scale-90">
                <img
                  src={testimonials[getIndex(-1)].image}
                  alt={`${testimonials[getIndex(-1)].name}'s testimonial`}
                  className="w-full h-auto object-cover"
                  draggable={false}
                />
              </div>
            </div>

            {/* Active card */}
            <div className="w-72 sm:w-80 lg:w-96 flex-shrink-0 transition-all duration-500 ease-out">
              <div
                role="button"
                tabIndex={0}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-primary/40 shadow-2xl shadow-primary/10 ring-4 ring-primary/10 transition-all duration-300 hover:shadow-3xl hover:ring-primary/20 dark:border-primary/50 dark:ring-primary/20 testimonial-slide-in"
                onClick={() => setLightbox(active)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setLightbox(active); }}
                aria-label={`Enlarge ${testimonials[active].name}'s testimonial`}
              >
                <img
                  src={testimonials[active].image}
                  alt={`${testimonials[active].name}'s testimonial`}
                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  draggable={false}
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                  <span className="rounded-full bg-white/90 px-4 py-1.5 text-sm font-medium text-gray-800 shadow-sm backdrop-blur-sm">
                    Click to enlarge ✨
                  </span>
                </div>
              </div>
              {/* Name badge */}
              <div className="mt-4 text-center">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary dark:bg-primary/20">
                  {testimonials[active].name}
                </span>
              </div>
            </div>

            {/* Next card (hidden on mobile) */}
            <div
              role="button"
              tabIndex={0}
              className="hidden md:block w-64 lg:w-72 flex-shrink-0 cursor-pointer transition-all duration-500 ease-out"
              onClick={() => goTo(getIndex(1))}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') goTo(getIndex(1)); }}
              aria-label={`View ${testimonials[getIndex(1)].name}'s testimonial`}
            >
              <div className="group relative overflow-hidden rounded-2xl border-2 border-gray-200/50 shadow-md transition-all duration-300 hover:shadow-xl hover:border-primary/30 dark:border-gray-700/50 opacity-60 hover:opacity-80 scale-90">
                <img
                  src={testimonials[getIndex(1)].image}
                  alt={`${testimonials[getIndex(1)].name}'s testimonial`}
                  className="w-full h-auto object-cover"
                  draggable={false}
                />
              </div>
            </div>
          </div>

          {/* Right Arrow */}
          <Button
            variant="outline"
            size="icon"
            onClick={next}
            className="absolute -right-2 top-1/2 z-20 h-11 w-11 -translate-y-1/2 rounded-full border-gray-200 bg-white/90 text-gray-600 shadow-lg backdrop-blur-sm transition-all hover:border-primary hover:bg-primary hover:text-white dark:border-gray-600 dark:bg-gray-800/90 dark:text-gray-300 dark:hover:border-primary dark:hover:bg-primary dark:hover:text-white sm:-right-5"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Dot Navigation */}
        <div className="mt-8 flex items-center justify-center gap-2">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === active
                  ? 'w-8 bg-primary shadow-sm shadow-primary/30'
                  : 'w-2.5 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500'
              }`}
              aria-label={`Go to testimonial ${i + 1}`}
            />
          ))}
        </div>

        {/* Thumbnail Strip */}
        <div className="mt-8 flex items-center justify-center">
          <div className="flex gap-2 sm:gap-3">
            {testimonials.map((person, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                  i === active
                    ? 'w-14 h-14 sm:w-16 sm:h-16 border-primary shadow-lg shadow-primary/20 scale-110 ring-2 ring-primary/20'
                    : 'w-11 h-11 sm:w-12 sm:h-12 border-gray-200 opacity-60 hover:opacity-100 hover:border-primary/40 hover:scale-105 dark:border-gray-700'
                }`}
              >
                <img
                  src={person.image}
                  alt={person.name}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Lightbox Modal ===== */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          {/* Backdrop button — accessible close target */}
          <button
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setLightbox(null)}
            aria-label="Close lightbox"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${testimonials[lightbox].name}'s testimonial enlarged`}
            className="relative max-h-[90vh] max-w-lg w-full animate-in zoom-in-95 duration-300"
          >
            {/* Close button */}
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg transition-all hover:bg-red-50 hover:text-red-500 dark:bg-gray-800 dark:text-gray-200"
            >
              ✕
            </button>

            <img
              src={testimonials[lightbox].image}
              alt={`${testimonials[lightbox].name}'s testimonial`}
              className="w-full h-auto rounded-2xl shadow-2xl"
            />

            {/* Lightbox navigation */}
            <div className="absolute inset-y-0 left-0 flex items-center -ml-5">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setLightbox((lightbox - 1 + total) % total)
                }
                className="h-10 w-10 rounded-full border-white/30 bg-white/90 text-gray-700 shadow-lg hover:bg-primary hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center -mr-5">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setLightbox((lightbox + 1) % total)
                }
                className="h-10 w-10 rounded-full border-white/30 bg-white/90 text-gray-700 shadow-lg hover:bg-primary hover:text-white"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Name */}
            <div className="mt-4 text-center">
              <span className="inline-flex items-center rounded-full bg-white/90 px-5 py-2 text-sm font-semibold text-gray-800 shadow-sm backdrop-blur-sm dark:bg-gray-800/90 dark:text-gray-100">
                {testimonials[lightbox].name}&apos;s Review
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
