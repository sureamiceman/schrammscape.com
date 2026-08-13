'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import PhotoCarousel, { Photo } from '@/components/PhotoCarousel'
import TabMenu from '@/components/TabMenu'
import FloatingCTA from '@/components/FloatingCTA'

// Showcase photos from project portfolio
const SHOWCASE_PHOTOS: Photo[] = [
  {
    id: '1',
    src: '/images/showcase/1BEA1724-7577-4A1D-83F9-38EDB3ABE756_1_105_c.jpeg',
    alt: 'Lawn care project',
    category: 'Lawn Care',
  },
  {
    id: '2',
    src: '/images/showcase/2280A7E4-3B6B-4BAA-AAE1-567151B7C69C_4_5005_c.jpeg',
    alt: 'Lawn care project',
    category: 'Lawn Care',
  },
  {
    id: '3',
    src: '/images/showcase/E8DC7A4A-EDDE-4BDD-86BC-22C4A5988E0E_1_105_c.jpeg',
    alt: 'Lawn care project',
    category: 'Lawn Care',
  },
  {
    id: '4',
    src: '/images/showcase/EABCE0E1-1EE2-4951-A6A2-EAC41EAF6868_4_5005_c.jpeg',
    alt: 'Lawn care project',
    category: 'Lawn Care',
  },
]

// Tyler bio photos
const BIO_PHOTOS: Photo[] = [
  {
    id: 'bio-1',
    src: '/images/bio/369919B7-D6CB-4F37-A063-1F72B4C705EA_1_105_c.jpeg',
    alt: 'Tyler Schramm',
    category: 'Tyler',
  },
  {
    id: 'bio-2',
    src: '/images/bio/EDEC9B63-0AC3-4B36-8CCC-B0CF536D4D84_1_105_c.jpeg',
    alt: 'Tyler Schramm',
    category: 'Tyler',
  },
]

const CONTACT_INFO = {
  phone: '(937) 602-1945',
  email: 'schrammscape@gmail.com',
  location: 'Troy and Tipp City, Ohio (45373 & 45371)',
  socials: [
    { name: 'Facebook', url: '#' },
  ],
}

const HISTORY_CONTENT = `My name is Tyler Schramm. My parents and numerous friends have helped me start SchrammScape Lawn Care and Landscaping Services. I like to say that I'm "Rooted in Faith, Committed to Excellence."

I believe in hard work and doing that work well. I started mowing for neighbors at 14 years old. I've built on that foundation and improved and increased in my capabilities and understanding.

I'm ready to serve the Troy and Tipp communities by providing reliable, quality lawn care. Whether you need regular care, vacation coverage, or help catching up on lawn care and landscaping projects, I'm here to help.

I intend to use this business as a way to pay for college and further my education in Business Finance.`

export default function Home() {
  const tabMenuRef = useRef<HTMLDivElement>(null)
  const [currentPhotos, setCurrentPhotos] = useState<Photo[]>(SHOWCASE_PHOTOS)

  const handleCTAClick = () => {
    // Scroll to Request Info tab
    const requestButton = document.querySelector('[data-tab="request"]') as HTMLElement
    if (requestButton) {
      requestButton.click()
      tabMenuRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleTabChange = (tab: 'contact' | 'history' | 'request') => {
    if (tab === 'history') {
      setCurrentPhotos(BIO_PHOTOS)
    } else {
      setCurrentPhotos(SHOWCASE_PHOTOS)
    }
  }

  const handleRequestInfo = () => {
    alert('Thank you! Tyler will be in touch soon.')
  }

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Header */}
      <header className="border-b flex-shrink-0 bg-white">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 relative">
              <Image
                src="/images/logo/0F32A119-F791-4906-A7E3-0A8E1614216B_1_105_c.jpeg"
                alt="SchrammScape Logo"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--hunter)' }}>SchrammScape</h1>
              <p className="text-xs" style={{ color: 'var(--grey-medium)' }}>Lawn Care & Landscaping</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {/* Desktop Layout (side-by-side) */}
        <div className="hidden md:grid md:grid-cols-2 gap-0 h-full">
          {/* Left: Photo Carousel */}
          <div className="border-r overflow-hidden">
            <PhotoCarousel photos={currentPhotos} />
          </div>

          {/* Right: Tab Menu */}
          <div ref={tabMenuRef} className="overflow-hidden">
            <TabMenu
              contactInfo={CONTACT_INFO}
              historyContent={HISTORY_CONTENT}
              onRequestInfo={handleRequestInfo}
              onTabChange={handleTabChange}
            />
          </div>
        </div>

        {/* Mobile Layout (stacked) */}
        <div className="md:hidden flex flex-col h-full">
          {/* Photo Carousel - 45% of viewport */}
          <div className="flex-shrink-0" style={{ height: '45%' }}>
            <PhotoCarousel photos={currentPhotos} />
          </div>

          {/* Tab Menu - 55% of viewport */}
          <div ref={tabMenuRef} className="flex-1 overflow-hidden">
            <TabMenu
              contactInfo={CONTACT_INFO}
              historyContent={HISTORY_CONTENT}
              onRequestInfo={handleRequestInfo}
              onTabChange={handleTabChange}
            />
          </div>
        </div>
      </main>

      {/* Floating CTA Button */}
      <FloatingCTA onClick={handleCTAClick} />
    </div>
  )
}
