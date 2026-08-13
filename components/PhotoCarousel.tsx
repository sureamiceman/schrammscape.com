'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

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
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isBeforeAfterMode, setIsBeforeAfterMode] = useState(false)

  const current = photos[currentIndex]

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length)
    setIsBeforeAfterMode(false)
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
    setIsBeforeAfterMode(false)
  }

  useEffect(() => {
    const timer = setTimeout(handleNext, 8000)
    return () => clearTimeout(timer)
  }, [currentIndex])

  return (
    <div className="w-full h-full flex flex-col">
      {/* Photo Display */}
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
          />
        )}

        {/* Category Badge */}
        <div className="category-badge">
          {current.category}
        </div>

        {/* Before/After Toggle Button */}
        {current.isBeforeAfter && (
          <button
            onClick={() => setIsBeforeAfterMode(!isBeforeAfterMode)}
            className="absolute bottom-3 right-3 bg-black/70 text-white px-3 py-1 rounded text-xs font-medium hover:bg-black/90 z-10"
          >
            {isBeforeAfterMode ? 'View Photo' : 'Before/After'}
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-4 py-4 bg-white border-t">
        <button
          onClick={handlePrev}
          className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition"
        >
          ‹
        </button>

        <div className="text-sm text-gray-600">
          {currentIndex + 1} / {photos.length}
        </div>

        <button
          onClick={handleNext}
          className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition"
        >
          ›
        </button>
      </div>
    </div>
  )
}

interface BeforeAfterSliderProps {
  before: string
  after: string
}

function BeforeAfterSlider({ before, after }: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50)

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
        const touch = e.touches[0]
        const container = e.currentTarget
        const rect = container.getBoundingClientRect()
        const newPosition = ((touch.clientX - rect.left) / rect.width) * 100
        setPosition(Math.max(0, Math.min(100, newPosition)))
      }}
    >
      <div className="relative w-full h-full">
        {/* After image (background) */}
        <Image src={after} alt="After" fill className="object-cover" />

        {/* Before image (overlay) */}
        <div style={{ width: `${position}%` }} className="absolute top-0 left-0 h-full overflow-hidden">
          <Image
            src={before}
            alt="Before"
            fill
            className="object-cover"
            style={{ width: '100vw' }}
          />
        </div>

        {/* Divider line */}
        <div
          style={{ left: `${position}%` }}
          className="absolute top-0 w-1 h-full bg-white shadow-lg"
        />

        {/* Labels */}
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
