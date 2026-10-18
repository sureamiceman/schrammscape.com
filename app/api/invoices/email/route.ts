// =============================================================================
// EMAIL INVOICE ENDPOINT — app/api/invoices/email/route.ts
// =============================================================================
// WHAT THIS FILE DOES:
//   Emails an existing invoice's PDF to the customer, from
//   noreply@schrammscape.com via Resend (the same sender the invoice copies
//   already use). Replies go to schrammscape@gmail.com, which also gets a
//   copy (CC) so there's a record of what was sent.
//
//   POST /api/invoices/email   { id, to }   (Authorization: Bearer <token>)
//   -> { success: true }
//
// SECURITY NOTE:
//   Reads the invoice as the signed-in caller (lib/invoiceServer.ts), so
//   only admin/manager accounts can send one, and only invoices they can see.
// =============================================================================

import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { BUSINESS_EMAIL, EMAIL_FROM, loadInvoice, renderInvoicePdf, signedInClient } from '@/lib/invoiceServer'

export const runtime = 'nodejs'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const caller = await signedInClient(request)
  if (!caller) return NextResponse.json({ error: 'Your session has expired — please sign in again.' }, { status: 401 })

  let body: { id?: string; to?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
  const to = (body.to || '').trim()
  if (!EMAIL_PATTERN.test(to)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })

  const invoice = body.id ? await loadInvoice(caller.db, body.id) : null
  if (!invoice) return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email is not set up on the server (RESEND_API_KEY missing).' }, { status: 500 })
  }

  const total = (invoice.lines || []).reduce((sum, l) => sum + (Number(l.amount) || 0), 0)
  const amount = total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  try {
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: EMAIL_FROM,
      to,
      cc: BUSINESS_EMAIL,
      replyTo: BUSINESS_EMAIL,
      subject: `Invoice ${invoice.number} from SchrammScape Lawncare`,
      text: [
        `Hello ${invoice.customer_name},`,
        ``,
        `Thank you for your business. Your invoice ${invoice.number} for ${amount} is attached.`,
        ``,
        `If you have any questions, just reply to this email.`,
        ``,
        `SchrammScape Lawncare`,
      ].join('\n'),
      attachments: [{ filename: `${invoice.number}.pdf`, content: (await renderInvoicePdf(invoice)).toString('base64') }],
    })
    if (error) throw new Error(error.message)
  } catch (err) {
    console.error('Failed to email invoice to customer:', err)
    return NextResponse.json({ error: 'The email could not be sent. Please try again.' }, { status: 502 })
  }
  return NextResponse.json({ success: true })
}
