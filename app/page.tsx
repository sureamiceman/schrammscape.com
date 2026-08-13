'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import PhotoCarousel, { Photo } from '@/components/PhotoCarousel'
import TabMenu from '@/components/TabMenu'
import FloatingCTA from '@/components/FloatingCTA'

// Placeholder photos - replace with actual images
const PLACEHOLDER_PHOTOS: Photo[] = [
  {
    id: '1',
    src: 'https://images.unsplash.com/photo-1585580914654-e904ae5ac53d?w=800&h=600&fit=crop',
    alt: 'Lawn mowing service',
    category: 'Landscaping',
    isBeforeAfter: true,
    afterSrc: 'https://images.unsplash.com/photo-1585580914662-e904ae5ac63e?w=800&h=600&fit=crop',
  },
  {
    id: '2',
    src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    alt: 'Garden landscaping',
    category: 'Landscaping',
  },
  {
    id: '3',
    src: 'https://images.unsplash.com/photo-1574009691717-5dcf2dd1c6a7?w=800&h=600&fit=crop',
    alt: 'Hardscape installation',
    category: 'Hardscaping',
  },
  {
    id: '4',
    src: 'https://images.unsplash.com/photo-1576839586733-c98ba3e42f9d?w=800&h=600&fit=crop',
    alt: 'Garden maintenance',
    category: 'Maintenance',
  },
]

const CONTACT_INFO = {
  phone: '(555) 123-4567',
  email: 'contact@schrammscape.com',
  location: 'Serving the local community',
  socials: [
    { name: 'Facebook', url: 'https://facebook.com' },
    { name: 'Instagram', url: 'https://instagram.com' },
  ],
}

const HISTORY_CONTENT = `Started at just 14 years old with a push mower and an ambition to work, SchrammScape Lawncare has grown from a side hustle into a thriving local business.

While putting myself through college, I discovered a passion for creating beautiful outdoor spaces. Every job was an opportunity to learn, improve, and build relationships with my community.

Today, SchrammScape Lawncare is known for attention to detail, reliability, and a genuine care for every property we service. From basic lawn maintenance to complete landscape transformations, we bring the same work ethic and enthusiasm that started it all.

This isn't just a business—it's a testament to hard work, persistence, and the belief that great things grow from small beginnings.`

export default function Home() {
  const tabMenuRef = useRef<HTMLDivElement>(null)

  const handleCTAClick = () => {
    // Scroll to Request Info tab
    const requestButton = document.querySelector('[data-tab="request"]') as HTMLElement
    if (requestButton) {
      requestButton.click()
      tabMenuRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleRequestInfo = () => {
    alert('Thank you! Tyler will be in touch soon.')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b sticky top-0 z-40 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 relative">
              {/* Logo placeholder - replace with actual logo */}
              <div className="w-full h-full bg-grass rounded-full flex items-center justify-center text-white font-bold text-sm">
                S
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-grass">SchrammScape</h1>
              <p className="text-xs text-gray-600">Lawncare</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {/* Desktop Layout (side-by-side) */}
        <div className="hidden md:grid md:grid-cols-2 gap-0 min-h-screen">
          {/* Left: Photo Carousel */}
          <div className="border-r">
            <PhotoCarousel photos={PLACEHOLDER_PHOTOS} />
          </div>

          {/* Right: Tab Menu */}
          <div ref={tabMenuRef}>
            <TabMenu
              contactInfo={CONTACT_INFO}
              historyContent={HISTORY_CONTENT}
              onRequestInfo={handleRequestInfo}
            />
          </div>
        </div>

        {/* Mobile Layout (stacked) */}
        <div className="md:hidden flex flex-col">
          {/* Photo Carousel */}
          <div className="h-96">
            <PhotoCarousel photos={PLACEHOLDER_PHOTOS} />
          </div>

          {/* Tab Menu */}
          <div ref={tabMenuRef} className="flex-1">
            <TabMenu
              contactInfo={CONTACT_INFO}
              historyContent={HISTORY_CONTENT}
              onRequestInfo={handleRequestInfo}
            />
          </div>
        </div>
      </main>

      {/* Floating CTA Button */}
      <FloatingCTA onClick={handleCTAClick} />
    </div>
  )
}
