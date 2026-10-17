// =============================================================================
// INVOICE APP — components/invoices/InvoiceApp.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   The whole schrammscape.com/invoices experience: checks whether
//   someone is signed in (showing LoginForm if not), and once signed in,
//   renders the two-panel dashboard — invoices/statuses on the left,
//   and either a "Create New Invoice" button or the create-invoice form
//   on the right, toggled by that button.
//
// DEPENDS ON:
//   - lib/supabaseClient.ts for auth state and reading the invoices table.
//   - components/invoices/LoginForm.tsx
//   - components/invoices/InvoiceList.tsx
//   - components/invoices/InvoiceForm.tsx
//
// USED BY:
//   - app/invoices/page.tsx
// =============================================================================

'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import LoginForm from './LoginForm'
import InvoiceList, { type InvoiceRow } from './InvoiceList'
import InvoiceForm from './InvoiceForm'

export default function InvoiceApp() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [view, setView] = useState<'idle' | 'create'>('idle')

  // Restore an existing session on load, and keep listening for
  // sign-in/sign-out (mirrors how the iPhone app's restoreSession works).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const fetchInvoices = useCallback(async () => {
    setInvoicesLoading(true)
    const { data, error } = await supabase
      .from('invoices')
      .select('id, number, customer_name, issue_date, status, lines')
      .is('deleted_at', null)
      .order('issue_date', { ascending: false })
    if (!error && data) setInvoices(data as InvoiceRow[])
    setInvoicesLoading(false)
  }, [])

  useEffect(() => {
    if (session) fetchInvoices()
  }, [session, fetchInvoices])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    )
  }

  if (!session) {
    return <LoginForm />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--hunter)' }}>
          SchrammScape Invoices
        </h1>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="hidden sm:inline">{session.user.email}</span>
          <button className="text-gray-500 hover:text-gray-800 underline" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 max-w-6xl mx-auto">
        {/* Left panel: every invoice and its status/total. */}
        <section className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Invoices</h2>
            <button onClick={fetchInvoices} className="text-sm text-gray-500 hover:text-gray-800">
              Refresh
            </button>
          </div>
          <InvoiceList invoices={invoices} loading={invoicesLoading} />
        </section>

        {/* Right panel: toggles between a "Create New Invoice" prompt and
            the actual form. */}
        <section className="bg-white rounded-lg border p-4">
          {view === 'idle' ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 py-12">
              <p className="text-gray-500 text-sm text-center max-w-xs">
                Create an ad-hoc invoice for a job outside the regular mowing schedule.
              </p>
              <button
                onClick={() => setView('create')}
                className="px-5 py-2.5 rounded-md text-white font-medium"
                style={{ backgroundColor: 'var(--hunter)' }}
              >
                + Create New Invoice
              </button>
            </div>
          ) : (
            <InvoiceForm
              onCancel={() => setView('idle')}
              onCreated={() => {
                fetchInvoices()
              }}
            />
          )}
        </section>
      </main>
    </div>
  )
}
