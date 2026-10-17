// =============================================================================
// SERVICE WORKER REGISTRATION — components/app/ServiceWorkerRegister.tsx
// =============================================================================
// Registers public/sw.js for the /app section only. Skipped during local
// development (npm run dev) so cached files never hide code changes.
// =============================================================================

'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/app' }).catch((err) => {
      console.warn('Service worker registration failed:', err)
    })
  }, [])
  return null
}
