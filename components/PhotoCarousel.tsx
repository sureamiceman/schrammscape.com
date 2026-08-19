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
//       before it was landscaped vs. after) — visitors can drag/slide to
//       compare the two images
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
  // Whether the before/after comparison slider is currently active for the
  // photo being shown (only relevant when that photo has isBeforeAfter: true).
  const [isBeforeAfterMode, setIsBeforeAfterMode] = useState(false)

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
      <div className="relative flex-1 bg-gray-100 overflow-hidden">
        {current.isBeforeAfter && isBeforeAfterMode ? (
          <BeforeAfterSlider before={current.src} after={current.afterSrc || ''} />
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
            isBeforeAfter is true. Lets the visitor switch between the
            normal photo and the drag-to-compare slider. */}
        {current.isBeforeAfter && (
          <button
            onClick={() => setIsBeforeAfterMode(!isBeforeAfterMode)}
            className="absolute bottom-3 right-3 bg-black/70 text-white px-3 py-1 rounded text-xs font-medium hover:bg-black/90 z-10"
          >
            {isBeforeAfterMode ? 'View Photo' : 'Before/After'}
          </button>
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

// =============================================================================
// BEFORE/AFTER SLIDER — a sub-component used only inside PhotoCarousel above
// =============================================================================
// WHAT IT DOES:
//   Shows the "after" photo as the full background, with the "before" photo
//   overlaid on top of it. A visitor can move their mouse (or finger, on
//   touchscreens) left/right across the image to reveal more or less of the
//   "before" photo, letting them drag a vertical divider line to compare
//   the two side by side.
//
// DEPENDS ON:
//   - Only used by PhotoCarousel above; not used anywhere else in the site.
//   - Requires both a "before" and "after" image path to be passed in.
// =============================================================================
interface BeforeAfterSliderProps {
  before: string
  after: string
}

function BeforeAfterSlider({ before, after }: BeforeAfterSliderProps) {
  // How far across the image the divider line currently sits, as a
  // percentage from 0 (all "after") to 100 (all "before").
  const [position, setPosition] = useState(50)

  // Updates the divider position as the visitor moves their mouse across
  // the image (desktop/laptop pointer devices).
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    const rect = container.getBoundingClientRect()
    const newPosition = ((e.clientX - rect.left) / rect.width) * 100
    setPosition(Math.max(0, Math.min(100, newPosition)))
  }

  return (
    <div
      className="relative w-full h-full cursor-col-resize"
      onMouseMove={handleMouseMove}
      onTouchMove={(e) => {
        // Same idea as handleMouseMove above, but for touchscreen drags
        // (phones/tablets) instead of mouse movement.
        const touch = e.touches[0]
        const container = e.currentTarget
        const rect = container.getBoundingClientRect()
        const newPosition = ((touch.clientX - rect.left) / rect.width) * 100
        setPosition(Math.max(0, Math.min(100, newPosition)))
      }}
    >
      <div className="relative w-full h-full">
        {/* "After" image sits as the full-size background layer. */}
        <Image src={after} alt="After" fill className="object-cover" />

        {/* "Before" image is layered on top, but clipped to only show
            up to the current divider position (so it looks like it's
            being "revealed" as the visitor drags). */}
        <div style={{ width: `${position}%` }} className="absolute top-0 left-0 h-full overflow-hidden">
          <Image
            src={before}
            alt="Before"
            fill
            className="object-cover"
            style={{ width: '100vw' }}
          />
        </div>

        {/* The vertical white divider line that tracks the mouse/touch
            position, visually separating "before" from "after". */}
        <div
          style={{ left: `${position}%` }}
          className="absolute top-0 w-1 h-full bg-white shadow-lg"
        />

        {/* Small "Before" / "After" text labels in the corners so
            visitors know which side is which. */}
        <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded text-sm font-medium">
          Before
        </div>
        <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded text-sm font-medium">
          After
        </div>
      </div>
    </div>
  )
}
