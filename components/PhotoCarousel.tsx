// =============================================================================
// PHOTO CAROUSEL — components/PhotoCarousel.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   Displays photos in a rotating slideshow, with:
//     - A colored category badge (e.g. "Lawn Care", "Landscape") for
//       single photos
//     - Left/right arrow buttons and a "2 / 5" counter to navigate manually
//     - Automatic advancing to the next photo every 8 seconds
//     - Side-by-side before/after comparison on mobile, stacked on desktop
//       for photo pairs (like a flowerbed before it was landscaped vs. after)
//
// DEPENDS ON:
//   - The "photos" list passed in by whichever page uses it. Right now that
//     list comes from app/page.tsx (either SHOWCASE_PHOTOS or BIO_PHOTOS).
//   - The .category-badge CSS class defined in app/globals.css, which styles
//     the colored label shown on each photo.
//   - Next.js's built-in <Image> component for optimized image loading.
//
// USED BY / DEPENDED ON BY:
//   - app/page.tsx renders this TWICE (once for desktop layout, once for
//     mobile layout) and feeds it whichever photo list should currently be
//     shown.
//
// IF YOU CHANGE THIS FILE:
//   - Changing the 8000 (milliseconds) below changes how fast photos
//     auto-advance.
//   - This file does NOT contain the actual photo URLs or category names —
//     those live in app/page.tsx. This file only controls HOW photos are
//     displayed, not WHICH photos are shown.
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

// -----------------------------------------------------------------------
// Photo — the shape of data each photo must provide.
// -----------------------------------------------------------------------
// id           — a unique identifier for this photo (any string works, as
//                long as no two photos in the same list share one).
// src          — the image file path, e.g. "/images/showcase/example.jpeg".
// alt          — a short text description of the photo, used by screen
//                readers for accessibility (not visibly shown to sighted
//                visitors).
// category     — the text shown in the colored badge on single photos
//                (e.g. "Lawn Care"). Not shown for before/after pairs.
// isBeforeAfter — optional. Set to true to display this as a before/after
//                comparison. When true, "afterSrc" is required too.
// afterSrc     — optional. The "after" image to display alongside "src"
//                (the "before" image) when isBeforeAfter is true.
// -----------------------------------------------------------------------
export interface Photo {
  id: string
  src: string
  alt: string
  category: string
  isBeforeAfter?: boolean
  afterSrc?: string
}

interface PhotoCarouselProps {
  photos: Photo[]
}

export default function PhotoCarousel({ photos }: PhotoCarouselProps) {
  // Which photo in the list is currently being shown (0 = first photo).
  const [currentIndex, setCurrentIndex] = useState(0)

  // -----------------------------------------------------------------
  // Reset to the first photo whenever the photo LIST itself changes.
  // -----------------------------------------------------------------
  // Example: app/page.tsx swaps in a different photo list when the visitor
  // clicks the "History" tab. Without this, the carousel could end up
  // pointing at an index that doesn't exist in the new (shorter) list.
  // -----------------------------------------------------------------
  useEffect(() => {
    setCurrentIndex(0)
  }, [photos])

  // Advances to the next photo, wrapping back to the start after the last one.
  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length)
  }

  // Goes back to the previous photo, wrapping to the end if on the first one.
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }

  // -----------------------------------------------------------------
  // Auto-advance timer: moves to the next photo automatically every
  // 8 seconds (8000 milliseconds). Restarts whenever the visitor
  // manually changes photos, so it doesn't skip ahead unexpectedly.
  // -----------------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(handleNext, 8000)
    return () => clearTimeout(timer)
  }, [currentIndex])

  const current = photos[currentIndex]

  // Safety check: if the photo list is empty, render nothing instead of
  // crashing (there's no photo to show).
  if (!current) return null

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* ================================================================
          PHOTO DISPLAY AREA
          Shows either a normal photo, or (if the current photo supports
          it and the visitor has toggled it on) the before/after slider.
      ================================================================= */}
      {/* Photo display area — side-by-side on mobile, stacked on desktop */}
      <div className="relative flex-1 bg-gray-100 overflow-hidden">
        {current.isBeforeAfter ? (
          // Before/After comparison: side-by-side on mobile, stacked on desktop
          <div className="w-full h-full flex md:flex-col">
            {/* Before image — left side on mobile, top on desktop */}
            <div className="relative w-1/2 md:w-full md:h-1/2 flex-1">
              <Image
                src={current.src}
                alt={`Before - ${current.alt}`}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 50vw, 100vw"
              />
              <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium">
                Before
              </div>
            </div>

            {/* After image — right side on mobile, bottom on desktop */}
            <div className="relative w-1/2 md:w-full md:h-1/2 flex-1">
              <Image
                src={current.afterSrc || ''}
                alt={`After - ${current.alt}`}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 50vw, 100vw"
              />
              <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium">
                After
              </div>
            </div>
          </div>
        ) : (
          // Normal single photo
          <>
            <Image
              src={current.src}
              alt={current.alt}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            {/* Category Badge */}
            <div className="category-badge">
              {current.category}
            </div>
          </>
        )}
      </div>

      {/* ================================================================
          NAVIGATION BAR — previous/next arrow buttons and a "1 / 5"
          style counter showing position in the photo list.
      ================================================================= */}
      <div className="flex items-center justify-between px-3 py-3 bg-white border-t flex-shrink-0">
        <button
          onClick={handlePrev}
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition text-sm"
        >
          ‹
        </button>

        <div className="text-xs text-gray-600">
          {currentIndex + 1} / {photos.length}
        </div>

        <button
          onClick={handleNext}
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition text-sm"
        >
          ›
        </button>
      </div>
    </div>
  )
}
