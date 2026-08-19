// =============================================================================
// PHOTO CAROUSEL — components/PhotoCarousel.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   Displays one photo at a time in a rotating slideshow, with:
//     - A colored category badge (e.g. "Lawn Care", "Landscape") in the
//       top-left corner of the photo
//     - Left/right arrow buttons and a "2 / 5" counter to navigate manually
//     - Automatic advancing to the next photo every 8 seconds
//     - A special "Before/After" mode for photo pairs (like a flowerbed
//       before it was landscaped vs. after) — visitors can tap the image
//       to toggle between before and after photos
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
// category     — the text shown in the colored badge on the photo
//                (e.g. "Lawn Care").
// isBeforeAfter — optional. Set to true to enable the before/after slider
//                for this photo. When true, "afterSrc" is required too.
// afterSrc     — optional. The "after" image to compare against "src"
//                (which becomes the "before" image) when isBeforeAfter
//                is true.
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
  // Whether the before/after comparison mode is active for the photo being shown
  // (only relevant when that photo has isBeforeAfter: true).
  const [isBeforeAfterMode, setIsBeforeAfterMode] = useState(false)
  // Which image is shown in before/after mode: true = after, false = before
  const [showAfter, setShowAfter] = useState(false)

  // -----------------------------------------------------------------
  // Reset to the first photo whenever the photo LIST itself changes.
  // -----------------------------------------------------------------
  // Example: app/page.tsx swaps in a different photo list when the visitor
  // clicks the "History" tab. Without this, the carousel could end up
  // pointing at an index that doesn't exist in the new (shorter) list.
  // -----------------------------------------------------------------
  useEffect(() => {
    setCurrentIndex(0)
    setIsBeforeAfterMode(false)
    setShowAfter(false)
  }, [photos])

  // Advances to the next photo, wrapping back to the start after the last one.
  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length)
    setIsBeforeAfterMode(false)
  }

  // Goes back to the previous photo, wrapping to the end if on the first one.
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
    setIsBeforeAfterMode(false)
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
      <div
        className="relative flex-1 bg-gray-100 overflow-hidden cursor-pointer"
        onClick={() => {
          if (current.isBeforeAfter && isBeforeAfterMode) {
            setShowAfter(!showAfter)
          }
        }}
      >
        {current.isBeforeAfter && isBeforeAfterMode ? (
          <Image
            src={showAfter ? current.afterSrc || '' : current.src}
            alt={showAfter ? 'After' : 'Before'}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <Image
            src={current.src}
            alt={current.alt}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        )}

        {/* Category Badge — the colored label in the top-left corner,
            e.g. "Lawn Care" or "Landscape". Text and color come from
            the .category-badge style in app/globals.css. */}
        <div className="category-badge">
          {current.category}
        </div>

        {/* Before/After Toggle Button — only appears on photos where
            isBeforeAfter is true. Lets the visitor enter before/after
            comparison mode (then tap the image to toggle between before/after). */}
        {current.isBeforeAfter && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsBeforeAfterMode(!isBeforeAfterMode)
              setShowAfter(false)
            }}
            className="absolute bottom-3 right-3 bg-black/70 text-white px-3 py-1 rounded text-xs font-medium hover:bg-black/90 z-10"
          >
            {isBeforeAfterMode ? 'View Photo' : 'Compare'}
          </button>
        )}

        {/* Tap hint — shown when in before/after mode to indicate image is tappable */}
        {current.isBeforeAfter && isBeforeAfterMode && (
          <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded text-xs font-medium">
            {showAfter ? 'After' : 'Before'} — Tap to toggle
          </div>
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
