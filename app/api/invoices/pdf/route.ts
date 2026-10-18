// =============================================================================
// INVOICE PDF ENDPOINT — app/api/invoices/pdf/route.ts
// =============================================================================
// WHAT THIS FILE DOES:
//   Re-creates the PDF of an existing invoice (same layout and logo as when
//   it was created) so it can be shared, printed or downloaded again from
//   the invoice list. Works for invoices made in the iPhone app too.
//
//   GET /api/invoices/pdf?id=<invoice id>   (Authorization: Bearer <token>)
//   -> application/pdf
//
// SECURITY NOTE:
//   Reads the invoice as the signed-in caller (lib/invoiceServer.ts), so
//   only admin/manager accounts, who can see invoices, get a PDF.
// =============================================================================

import { NextResponse } from 'next/server'
import { loadInvoice, renderInvoicePdf, signedInClient } from '@/lib/invoiceServer'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const caller = await signedInClient(request)
  if (!caller) return NextResponse.json({ error: 'Your session has expired — please sign in again.' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id') || ''
  const invoice = id ? await loadInvoice(caller.db, id) : null
  if (!invoice) return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })

  const pdf = await renderInvoicePdf(invoice)
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.number}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
