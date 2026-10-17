// =============================================================================
// CREATE INVOICE ENDPOINT — app/api/invoices/create/route.ts
// =============================================================================
// WHAT THIS FILE DOES:
//   The server-side endpoint behind the /invoices page's "Create New
//   Invoice" form. Given a signed-in user's access token and the invoice
//   details, it:
//     1. Verifies the token against Supabase Auth.
//     2. Works out the next invoice number (one higher than the highest
//        existing "INV-###"), matching the numbering the iPhone app uses.
//     3. Inserts the invoice into the same `invoices` table the iPhone
//        app reads — it shows up there on the app's next sync.
//     4. Renders a PDF of the invoice (same layout as the app's PDF and
//        the printed paper template).
//     5. Emails that PDF to schrammscape@gmail.com via Resend.
//     6. Returns the PDF (as base64) to the browser too, so it can be
//        downloaded immediately without waiting on email.
//
// DEPENDS ON:
//   - NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (same ones
//     the browser uses — see lib/supabaseClient.ts).
//   - RESEND_API_KEY (already set up for the homepage contact form).
//   - lib/generateInvoicePdf.tsx for the PDF layout.
//
// SECURITY NOTE:
//   This does NOT use the Supabase service-role key anywhere. It uses the
//   public anon key plus the calling user's own access token, so Row
//   Level Security applies exactly as if the insert came straight from
//   the browser — only a signed-in admin/manager account (Tim or Tyler)
//   can actually create an invoice through this endpoint.
// =============================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { Resend } from 'resend'
import { generateInvoicePdfBuffer } from '@/lib/generateInvoicePdf'

// Needs real filesystem/Node APIs (Buffer, crypto) — not the Edge runtime.
export const runtime = 'nodejs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const RECIPIENT_EMAIL = 'schrammscape@gmail.com'
const EMAIL_FROM = 'SchrammScape Invoices <noreply@schrammscape.com>'

interface CreateInvoiceLine {
  date: string | null
  details: string
  amount: number
}

interface CreateInvoiceBody {
  customerName: string
  customerAddress: string
  issueDate: string
  notes: string
  lines: CreateInvoiceLine[]
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  let body: CreateInvoiceBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const customerName = (body.customerName || '').trim()
  const customerAddress = (body.customerAddress || '').trim()
  const notes = (body.notes || '').trim()
  const issueDate = body.issueDate || new Date().toISOString()
  const lines = (body.lines || [])
    .map((l) => ({
      date: l.date || null,
      details: (l.details || '').trim(),
      amount: Number(l.amount) || 0,
    }))
    .filter((l) => l.details && l.amount > 0)

  if (!customerName) {
    return NextResponse.json({ error: 'Customer name is required.' }, { status: 400 })
  }
  if (lines.length === 0) {
    return NextResponse.json(
      { error: 'At least one line item with a description and amount is required.' },
      { status: 400 }
    )
  }

  // Scoped to the calling user's own access token — RLS applies exactly
  // as if this insert came from the browser, not from a trusted backend.
  const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const {
    data: { user },
    error: authError,
  } = await userSupabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Your session has expired — please sign in again.' }, { status: 401 })
  }

  // Next invoice number: one higher than the highest existing "INV-###",
  // the same rule Invoice.nextNumber(context:) uses in the iPhone app.
  const { data: existing, error: existingError } = await userSupabase.from('invoices').select('number')
  if (existingError) {
    return NextResponse.json(
      { error: `Could not read existing invoices: ${existingError.message}` },
      { status: 403 }
    )
  }
  const highest = (existing ?? [])
    .map((row) => parseInt((row.number || '').split('-').pop() || '', 10))
    .filter((n) => !isNaN(n))
    .reduce((max, n) => Math.max(max, n), 0)
  const number = `INV-${String(highest + 1).padStart(3, '0')}`

  const lineRows = lines.map((l) => ({
    id: randomUUID(),
    date: l.date,
    details: l.details,
    amount: l.amount,
  }))

  const invoiceRow = {
    id: randomUUID(),
    number,
    customer_name: customerName,
    customer_address: customerAddress,
    issue_date: issueDate,
    status: 'open',
    notes,
    lines: lineRows,
  }

  const { error: insertError } = await userSupabase.from('invoices').insert(invoiceRow)
  if (insertError) {
    return NextResponse.json({ error: `Could not save the invoice: ${insertError.message}` }, { status: 403 })
  }

  const pdfBuffer = await generateInvoicePdfBuffer({
    number,
    customerName,
    customerAddress,
    issueDate,
    notes,
    lines: lineRows,
  })

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: EMAIL_FROM,
        to: RECIPIENT_EMAIL,
        subject: `Invoice ${number} — ${customerName}`,
        text: [
          `Invoice ${number} for ${customerName} was created via schrammscape.com/invoices`,
          `by ${user.email}.`,
          ``,
          `See the attached PDF.`,
        ].join('\n'),
        attachments: [{ filename: `${number}.pdf`, content: pdfBuffer.toString('base64') }],
      })
    } catch (err) {
      // The invoice is already safely saved even if the email fails —
      // don't fail the whole request over an email hiccup, just log it.
      console.error('Failed to email invoice PDF:', err)
    }
  } else {
    console.error('RESEND_API_KEY not set — invoice PDF was not emailed.')
  }

  return NextResponse.json({
    success: true,
    number,
    pdfBase64: pdfBuffer.toString('base64'),
  })
}
