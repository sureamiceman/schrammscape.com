// =============================================================================
// ROOT LAYOUT — app/layout.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   This is the outermost "wrapper" for every page on the website. In a
//   Next.js site, this file automatically applies to ALL pages — there is
//   currently only one page (app/page.tsx, the homepage), so in practice
//   this wrapper just sets up the <html> and <body> tags and the browser
//   tab's title/description.
//
// DEPENDS ON:
//   - app/globals.css — imported below so the site's colors, fonts, and
//     styling rules are loaded before anything else renders.
//
// USED BY / DEPENDED ON BY:
//   - Next.js itself. This is a special file name that Next.js looks for
//     automatically — you never import it manually anywhere.
//   - Every page in the "app" folder (currently just app/page.tsx) is
//     rendered INSIDE this layout's {children} slot.
//
// IF YOU CHANGE THIS FILE:
//   - Editing the "metadata" section below changes what shows up in the
//     browser tab and in Google search results/link previews.
//   - Editing the <html>/<body> markup affects every single page on the site.
// =============================================================================

import type { Metadata } from 'next'
import './globals.css'

// -----------------------------------------------------------------------
// SITE METADATA
// -----------------------------------------------------------------------
// Controls the browser tab title and the description search engines/social
// media previews use. Update these if the business name or tagline changes.
// -----------------------------------------------------------------------
export const metadata: Metadata = {
  title: 'SchrammScape Lawncare',
  description: 'Professional lawn care services. Started at 14 with a push mower, now serving the community.',
}

// -----------------------------------------------------------------------
// ROOT LAYOUT COMPONENT
// -----------------------------------------------------------------------
// "children" here represents whatever page is currently being viewed
// (right now, that's always app/page.tsx — the homepage). Next.js
// automatically slots the current page's content in where {children}
// appears below.
// -----------------------------------------------------------------------
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
