// =============================================================================
// INVOICES PAGE — app/invoices/page.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   The page that lives at schrammscape.com/invoices. It is NOT linked
//   from the main site navigation — Tim and Tyler just go to the URL
//   directly. Shows a login screen, then (once signed in with the same
//   account used in the iPhone app) the invoice dashboard.
//
// DEPENDS ON:
//   - components/invoices/InvoiceApp.tsx, which does all the actual work
//     (auth, the invoice list, the create-invoice form).
//
// IF YOU CHANGE THIS FILE:
//   - Keep this file itself simple — add features inside
//     components/invoices/ instead, this is just the route entry point.
// =============================================================================

import InvoiceApp from '@/components/invoices/InvoiceApp'

export const metadata = {
  title: 'Invoices — SchrammScape',
  robots: { index: false, follow: false },
}

export default function InvoicesPage() {
  return <InvoiceApp />
}
