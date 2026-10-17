// =============================================================================
// APP LAYOUT — app/app/layout.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   Wraps every screen under schrammscape.com/app (the installable crew app,
//   the web replacement for the SchrammScape Calendar iPhone app). It:
//     - points phones at the app's manifest + icons, so "Add to Home Screen"
//       installs it as "SchrammScape" with the logo and no Safari bars
//     - registers the service worker (public/sw.js) for fast/offline opening
//     - keeps the app out of Google search results
//
//   These settings are deliberately ONLY on /app, so the public homepage
//   doesn't offer to install the crew app to customers.
// =============================================================================

import type { Metadata, Viewport } from 'next'
import ServiceWorkerRegister from '@/components/app/ServiceWorkerRegister'

export const metadata: Metadata = {
  title: 'SchrammScape',
  description: 'SchrammScape Lawncare crew app',
  manifest: '/app.webmanifest',
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: 'SchrammScape',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/app-icons/icon-192.png',
    apple: '/app-icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#355e3b',
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ss-app">
      <ServiceWorkerRegister />
      {children}
    </div>
  )
}
