// =============================================================================
// INVOICE LIST — components/invoices/InvoiceList.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   The left-hand panel of the invoice dashboard: every invoice (from
//   both the iPhone app and this web page — they share the same
//   Supabase table), newest first, with its status and total. Tap an
//   invoice to share, print, download or email its PDF again
//   (components/invoices/InvoiceActions.tsx).
//
// USED BY:
//   - components/invoices/InvoiceApp.tsx, which fetches the invoices and
//     passes them in as props.
// =============================================================================

'use client'

import { useState } from 'react'
import InvoiceActions from './InvoiceActions'

export interface InvoiceLineJson {
  id?: string
  date?: string | null
  details: string
  amount: number
}

export interface InvoiceRow {
  id: string
  number: string
  customer_name: string
  issue_date: string
  status: string
  lines: InvoiceLineJson[]
}

function total(lines: InvoiceLineJson[]) {
  return (lines || []).reduce((sum, l) => sum + (Number(l.amount) || 0), 0)
}

function formatCurrency(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function InvoiceList({ invoices, loading }: { invoices: InvoiceRow[]; loading: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null)
  if (loading) {
    return <p className="text-sm text-gray-400">Loading invoices…</p>
  }
  if (invoices.length === 0) {
    return <p className="text-sm text-gray-400">No invoices yet.</p>
  }
  return (
    <div className="divide-y max-h-[65vh] overflow-y-auto">
      {invoices.map((inv) => (
        <div key={inv.id} className="py-3">
          <button
            onClick={() => setOpenId(openId === inv.id ? null : inv.id)}
            className="w-full flex items-center justify-between gap-3 text-left"
            aria-expanded={openId === inv.id}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{inv.customer_name}</p>
              <p className="text-xs text-gray-400">
                {inv.number} · {formatDate(inv.issue_date)}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {inv.status === 'paid' ? 'Paid' : 'Open'}
              </span>
              <span className="text-sm font-semibold text-gray-700 w-20 text-right">
                {formatCurrency(total(inv.lines))}
              </span>
            </div>
          </button>
          {openId === inv.id && (
            <div className="mt-3">
              <InvoiceActions invoiceId={inv.id} number={inv.number} customerName={inv.customer_name} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
