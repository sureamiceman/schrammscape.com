// =============================================================================
// INVOICE SERVER HELPERS — lib/invoiceServer.ts
// =============================================================================
// WHAT THIS FILE DOES:
//   Shared pieces for the server endpoints that work on an EXISTING invoice:
//     - app/api/invoices/pdf    (re-create its PDF to share or print)
//     - app/api/invoices/email  (email its PDF to the customer)
//
//   signedInClient() checks the caller's access token and returns a Supabase
//   client that acts as that person, so Row Level Security decides what they
//   can read (only admin/manager can see invoices), exactly as in the browser.
//   No service-role key is used.
//
//   Server-only: imports the PDF renderer.
// =============================================================================

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { generateInvoicePdfBuffer } from '@/lib/generateInvoicePdf'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const BUSINESS_EMAIL = 'schrammscape@gmail.com'
export const EMAIL_FROM = 'SchrammScape Invoices <noreply@schrammscape.com>'

/** The signed-in caller and a client acting as them, or null if the token is missing/expired. */
export async function signedInClient(request: Request): Promise<{ db: SupabaseClient; user: User } | null> {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) return null
  return { db, user: data.user }
}

export interface InvoiceRecord {
  id: string
  number: string
  customer_name: string
  customer_address: string
  issue_date: string
  notes: string
  lines: { date?: string | null; details: string; amount: number }[]
}

/** Loads one invoice the caller is allowed to see, or null. */
export async function loadInvoice(db: SupabaseClient, id: string): Promise<InvoiceRecord | null> {
  const { data } = await db
    .from('invoices')
    .select('id, number, customer_name, customer_address, issue_date, notes, lines')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  return (data as InvoiceRecord) ?? null
}

/** The same PDF layout used when the invoice was created (logo included). */
export function renderInvoicePdf(inv: InvoiceRecord) {
  return generateInvoicePdfBuffer({
    number: inv.number,
    customerName: inv.customer_name,
    customerAddress: inv.customer_address,
    issueDate: inv.issue_date,
    notes: inv.notes,
    lines: (inv.lines || []).map((l) => ({ date: l.date ?? null, details: l.details, amount: Number(l.amount) || 0 })),
  })
}
