// =============================================================================
// BILLING TAB — components/app/BillingTab.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   The invoices screen inside the crew app (admin/manager only). Reuses the
//   exact same list and create-invoice form as schrammscape.com/invoices, so
//   numbering, PDF layout and the email copy to schrammscape@gmail.com all
//   behave identically.
// =============================================================================

'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { loadCached, saveCached } from '@/lib/app/offlineCache'
import InvoiceList, { type InvoiceRow } from '@/components/invoices/InvoiceList'
import InvoiceForm from '@/components/invoices/InvoiceForm'

export default function BillingTab() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    const cached = loadCached<InvoiceRow[]>('invoices')
    if (cached) setInvoices(cached.data)
    setLoading(true)
    const { data, error } = await supabase
      .from('invoices')
      .select('id, number, customer_name, issue_date, status, lines')
      .is('deleted_at', null)
      .order('issue_date', { ascending: false })
    setLoading(false)
    if (!error && data) {
      setInvoices(data as InvoiceRow[])
      saveCached('invoices', data)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (creating) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <InvoiceForm onCancel={() => setCreating(false)} onCreated={load} />
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => setCreating(true)}
        className="w-full rounded-md text-white font-medium py-3 mb-4"
        style={{ backgroundColor: 'var(--hunter)' }}
      >
        + Create New Invoice
      </button>
      <section className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Invoices</h2>
          <button onClick={load} className="text-sm text-gray-500">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        <InvoiceList invoices={invoices} loading={loading && invoices.length === 0} />
      </section>
    </div>
  )
}
