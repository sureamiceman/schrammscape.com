// =============================================================================
// HOMEPAGE — app/page.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   This is the entire homepage of the SchrammScape website — the only page
//   on the site right now. It contains:
//     1. The photo content (showcase project photos + Tyler's bio photos)
//     2. The business contact info and "About" story text
//     3. The page layout (header, photo carousel on one side, info tabs on
//        the other, and a floating "Request Info" button)
//
//   THIS IS THE FILE MOST LIKELY TO NEED EDITS if you want to:
//     - Add/remove/reorder showcase photos or change their category labels
//     - Update the phone number, email, service area, or social links
//     - Edit Tyler's "Our Story" bio text
//     - Change the business name/logo shown in the header
//
// DEPENDS ON:
//   - components/PhotoCarousel.tsx — renders the rotating photo display
//     (including the before/after slider) using the photo lists defined here.
//   - components/TabMenu.tsx — renders the Contact / History / Request Info
//     tabs using the contact info and bio text defined here.
//   - components/FloatingCTA.tsx — renders the round floating button in the
//     bottom-right corner.
//   - app/layout.tsx — wraps this page with the outer <html>/<body> and site
//     metadata (see that file for details).
//   - Image files referenced below must actually exist in
//     public/images/showcase/, public/images/bio/, and public/images/logo/.
//     If a photo is added here but the file isn't in that folder, it will
//     show as a broken image.
//
// USED BY / DEPENDED ON BY:
//   - Next.js automatically turns this file into the site's homepage ("/")
//     because it's named "page.tsx" inside the "app" folder. Nothing else
//     needs to import it.
// =============================================================================

'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import PhotoCarousel, { Photo } from '@/components/PhotoCarousel'
import TabMenu from '@/components/TabMenu'
import FloatingCTA from '@/components/FloatingCTA'

// -----------------------------------------------------------------------
// SHOWCASE PHOTOS — the project photos shown by default in the carousel
// -----------------------------------------------------------------------
// This is the list of photos that appear when a visitor first loads the
// site, and whenever they're on the "Contact" or "Request Info" tabs.
//
// To ADD a new photo: copy one of the blocks below, give it a unique "id",
// point "src" at an image inside public/images/showcase/, write a short
// "alt" description (used for accessibility/screen readers), and set
// "category" to whatever label should appear as the colored badge on the
// photo (e.g. "Lawn Care", "Landscape").
//
// To ADD a BEFORE/AFTER photo pair (like the flowerbed project): set
// isBeforeAfter to true and afterSrc to the "after" image. This adds a
// toggle button on that photo letting visitors slide between before/after.
// -----------------------------------------------------------------------
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
  {
    id: '5',
    src: '/images/showcase/flowerbed-before.jpeg',
    alt: 'Flowerbed landscaping project',
    category: 'Landscape',
    isBeforeAfter: true,
    afterSrc: '/images/showcase/flowerbed-after.jpeg',
  },
  {
    id: 'sidewalk-2',
    src: '/images/showcase/sidewalk_2_before.jpg',
    alt: 'Sidewalk edging project',
    category: 'Edging',
    isBeforeAfter: true,
    afterSrc: '/images/showcase/sidewalk_2_after.jpg',
  },
  {
    id: 'lines3',
    src: '/images/showcase/lines_3.jpg',
    alt: 'Lawn care project',
    category: 'Lawn Care',
  },
]

// -----------------------------------------------------------------------
// BIO PHOTOS — photos of Tyler shown only while the "History" tab is open
// -----------------------------------------------------------------------
// When a visitor clicks the "History" tab (see handleTabChange below), the
// photo carousel swaps from SHOWCASE_PHOTOS to this list instead, so
// visitors see photos of Tyler while reading his story.
// -----------------------------------------------------------------------
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
  {
    id: 'bio3',
    src: '/images/bio/Schramm_approved.jpg',
    alt: 'Schramm-approved!',
    category: 'Tyler',
  },
]

// -----------------------------------------------------------------------
// CONTACT INFO — shown on the "Contact" tab
// -----------------------------------------------------------------------
// Edit these values directly to update the phone number, email, service
// area description, or social media links shown to visitors. Add more
// entries to "socials" to show additional social platforms (each needs a
// "name" — the link text — and a "url" — where it goes).
// -----------------------------------------------------------------------
const CONTACT_INFO = {
  phone: '(937) 602-1945',
  email: 'schrammscape@gmail.com',
  location: 'Serving the Troy and Tipp City Communities of Ohio',
  socials: [
    { name: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61587762076174' },
  ],
}

// -----------------------------------------------------------------------
// HISTORY CONTENT — Tyler's "Our Story" bio text, shown on the "History" tab
// -----------------------------------------------------------------------
// This is plain text with blank lines between paragraphs. TabMenu.tsx
// automatically splits it into separate paragraphs wherever there's a line
// break, so just edit the wording here — no special formatting needed.
// -----------------------------------------------------------------------
const HISTORY_CONTENT = `My name is Tyler Schramm. My parents and numerous friends have helped me start SchrammScape Lawn Care and Landscaping Services. I like to say that I'm "Rooted in Faith, Committed to Excellence."

I believe in hard work and doing that work well. I started mowing for neighbors at 14 years old. I've built on that foundation and improved and increased in my capabilities and understanding.

I'm ready to serve the Troy and Tipp communities by providing reliable, quality lawn care. Whether you need regular care, vacation coverage, or help catching up on lawn care and landscaping projects, I'm here to help.

I intend to use this business as a way to pay for college and further my education in Business Finance.`

// =============================================================================
// PAGE COMPONENT — assembles everything above into the visible page
// =============================================================================
export default function Home() {
  // A reference to the tab menu section, used so we can smoothly scroll the
  // page down to it on mobile when the floating button is clicked.
  const tabMenuRef = useRef<HTMLDivElement>(null)

  // Tracks which set of photos the carousel should currently display.
  // Starts out showing the showcase project photos.
  const [currentPhotos, setCurrentPhotos] = useState<Photo[]>(SHOWCASE_PHOTOS)

  // ---------------------------------------------------------------------
  // Floating button click handler
  // ---------------------------------------------------------------------
  // When the round floating button (bottom-right corner, from
  // components/FloatingCTA.tsx) is clicked, this finds the "Request Info"
  // tab button and clicks it programmatically, then scrolls it into view.
  // This is mainly useful on mobile, where the tabs may be below the fold.
  // ---------------------------------------------------------------------
  const handleCTAClick = () => {
    const requestButton = document.querySelector('[data-tab="request"]') as HTMLElement
    if (requestButton) {
      requestButton.click()
      tabMenuRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // ---------------------------------------------------------------------
  // Tab change handler
  // ---------------------------------------------------------------------
  // Called by components/TabMenu.tsx whenever the visitor switches tabs.
  // If they switch to "History", the photo carousel swaps to show Tyler's
  // bio photos instead of the project showcase photos. Switching to any
  // other tab restores the normal showcase photos.
  // ---------------------------------------------------------------------
  const handleTabChange = (tab: 'contact' | 'history' | 'request') => {
    if (tab === 'history') {
      setCurrentPhotos(BIO_PHOTOS)
    } else {
      setCurrentPhotos(SHOWCASE_PHOTOS)
    }
  }

  // ---------------------------------------------------------------------
  // Request form submit handler
  // ---------------------------------------------------------------------
  // Called by components/TabMenu.tsx (specifically its inner RequestForm)
  // after a visitor submits the "Request Info" form. Currently this just
  // shows a simple confirmation popup — it does NOT email or save the form
  // data anywhere yet. See the note in components/TabMenu.tsx for details.
  // ---------------------------------------------------------------------
  const handleRequestInfo = () => {
    alert('Thank you! Tyler will be in touch soon.')
  }

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* ================================================================
          HEADER — business name, tagline, and logo. Shown at the very
          top of the page on every screen size.
      ================================================================= */}
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

      {/* ================================================================
          MAIN CONTENT — holds the photo carousel and the info tabs.
          There are TWO versions of this layout below: one for desktop
          (wide screens, shown side-by-side) and one for mobile (narrow
          screens, stacked vertically). Only one is visible at a time —
          Tailwind's "hidden md:grid" / "md:hidden" classes handle the
          switch automatically based on screen width, no JavaScript needed.
      ================================================================= */}
      <main className="flex-1 overflow-hidden">
        {/* ---- Desktop Layout (photo carousel + tabs side-by-side) ---- */}
        <div className="hidden md:grid md:grid-cols-2 gap-0 h-full">
          {/* Left half: Photo Carousel */}
          <div className="border-r overflow-hidden">
            <PhotoCarousel photos={currentPhotos} />
          </div>

          {/* Right half: Tab Menu (Contact / History / Request Info) */}
          <div ref={tabMenuRef} className="overflow-hidden">
            <TabMenu
              contactInfo={CONTACT_INFO}
              historyContent={HISTORY_CONTENT}
              onRequestInfo={handleRequestInfo}
              onTabChange={handleTabChange}
            />
          </div>
        </div>

        {/* ---- Mobile Layout (photo carousel above, tabs below) ---- */}
        <div className="md:hidden flex flex-col h-full">
          {/* Top: Photo Carousel, sized to 45% of the visible screen height */}
          <div className="flex-shrink-0" style={{ height: '45%' }}>
            <PhotoCarousel photos={currentPhotos} />
          </div>

          {/* Bottom: Tab Menu, sized to 55% of the visible screen height */}
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

      {/* ================================================================
          FLOATING "REQUEST INFO" BUTTON — stays pinned to the bottom-right
          corner of the screen at all times, even while scrolling. Clicking
          it jumps the visitor straight to the Request Info tab.
      ================================================================= */}
      <FloatingCTA onClick={handleCTAClick} />
    </div>
  )
}
