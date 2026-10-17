// =============================================================================
// APP PAGE — app/app/page.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   The route entry point for schrammscape.com/app. Not linked from the
//   public site; the crew opens it from the home-screen icon. Keep this file
//   tiny: all the work lives in components/app/.
// =============================================================================

import AppShell from '@/components/app/AppShell'

export default function AppPage() {
  return <AppShell />
}
