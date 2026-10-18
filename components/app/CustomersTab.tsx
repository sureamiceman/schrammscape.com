// =============================================================================
// CUSTOMERS TAB — components/app/CustomersTab.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   The customer list from the shared database, grouped by mowing day, with
//   search, tap-to-navigate and tap-to-call. Rates are shown to
//   admin/manager only.
//
//   Admin/manager can also add, edit and delete customers (CustomerForm).
//   Saves show at once and go through lib/app/pendingChanges.ts, so they
//   wait for signal if needed. Delete is a soft delete (deleted_at), the
//   same as the iPhone app, so its next sync removes the customer too.
//   Crew can't change customers (database rule), so they get no buttons.
// =============================================================================

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { loadCached, saveCached } from '@/lib/app/offlineCache'
import { onPendingChange, pendingInserts, pendingPatch, queueChange, type FlushResult } from '@/lib/app/pendingChanges'
import { mapsUrl } from './TodayTab'
import CustomerForm, { BLANK_CUSTOMER, type CustomerPatch } from './CustomerForm'

export interface CustomerRow {
  id: string
  name: string
  address: string
  job_title: string
  duration_label: string
  day_of_week: string
  mower: string
  details: string
  phone: string
  email: string
  height: string
  default_rate: number
  visit_interval_weeks: number
  sort_order: number
  latitude: number | null
  longitude: number | null
  geocode_status: string
  /** 'per_visit' = invoice each visit; 'subscription' = monthly plan, visits get a completion notice. */
  billing_plan: 'per_visit' | 'subscription'
}

const CUSTOMER_COLUMNS =
  'id, name, address, job_title, duration_label, day_of_week, mower, details, phone, email, height, default_rate, visit_interval_weeks, sort_order, latitude, longitude, geocode_status, billing_plan'

/** Lays saves that haven't reached the database yet over loaded rows (and adds new, unsent customers). */
function withPending(rows: CustomerRow[]): CustomerRow[] {
  const merged = rows
    .map((r) => ({ ...r, ...(pendingPatch('customers', r.id) as Partial<CustomerRow & { deleted_at: string }>) }))
    .filter((r) => !('deleted_at' in r && r.deleted_at))
  const ids = new Set(rows.map((r) => r.id))
  const added = pendingInserts('customers').filter((r) => !ids.has(r.id as string)) as unknown as CustomerRow[]
  return [...merged, ...added]
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
function dayRank(day: string) {
  const i = DAYS.findIndex((d) => day.trim().toLowerCase().startsWith(d.slice(0, 3)))
  return i === -1 ? 99 : i
}

type Editing = { mode: 'new' } | { mode: 'edit'; customer: CustomerRow } | null

export default function CustomersTab({ showRates, canEdit }: { showRates: boolean; canEdit: boolean }) {
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [editing, setEditing] = useState<Editing>(null)
  const [, setPendingTick] = useState(0)
  const [loading, setLoading] = useState(true)
  const [staleSince, setStaleSince] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    const cached = loadCached<CustomerRow[]>('customers')
    if (cached) setCustomers(withPending(cached.data))
    setLoading(true)
    const { data, error } = await supabase
      .from('customers')
      .select(CUSTOMER_COLUMNS)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    setLoading(false)
    if (error || !data) {
      setStaleSince(cached?.savedAt ?? null)
      return
    }
    const rows = withPending(data as CustomerRow[])
    setCustomers(rows)
    setStaleSince(null)
    saveCached('customers', rows)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => onPendingChange(() => setPendingTick((n) => n + 1)), [])

  const reportFailures = ({ failed }: FlushResult) => {
    if (failed.length) {
      window.alert(`Couldn't save: ${failed.map((f) => f.message).join('; ')}`)
      load()
    }
  }

  const applyLocally = (update: (prev: CustomerRow[]) => CustomerRow[]) =>
    setCustomers((prev) => {
      const next = update(prev)
      saveCached('customers', next)
      return next
    })

  const save = (changes: CustomerPatch) => {
    if (editing?.mode === 'edit') {
      const id = editing.customer.id
      if (Object.keys(changes).length) {
        applyLocally((prev) => prev.map((c) => (c.id === id ? { ...c, ...changes } : c)))
        queueChange('customers', id, changes).then(reportFailures)
      }
    } else {
      const id = crypto.randomUUID()
      const sort_order = Math.max(-1, ...customers.map((c) => c.sort_order)) + 1
      const row = { ...BLANK_CUSTOMER, ...changes, id, sort_order }
      applyLocally((prev) => [...prev, row])
      queueChange('customers', id, { ...changes, sort_order }, { insert: true }).then(reportFailures)
    }
    setEditing(null)
  }

  const remove = (id: string) => {
    applyLocally((prev) => prev.filter((c) => c.id !== id))
    queueChange('customers', id, { deleted_at: new Date().toISOString() }).then(reportFailures)
    setEditing(null)
  }

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? customers.filter((c) => `${c.name} ${c.address} ${c.phone}`.toLowerCase().includes(q))
      : customers
    const byDay: Record<string, CustomerRow[]> = {}
    for (const c of filtered) {
      const key = c.day_of_week.trim() || 'No day set'
      ;(byDay[key] ??= []).push(c)
    }
    return Object.entries(byDay).sort((a, b) => dayRank(a[0]) - dayRank(b[0]) || a[0].localeCompare(b[0]))
  }, [customers, query])

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          type="search"
          placeholder={`Search ${customers.length} customers`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 min-w-0 border rounded-md px-3 py-2 text-base bg-white"
        />
        {canEdit && (
          <button
            onClick={() => setEditing({ mode: 'new' })}
            className="shrink-0 rounded-md px-3 text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--hunter)' }}
          >
            + Add
          </button>
        )}
      </div>
      {staleSince && (
        <p className="text-xs text-amber-700 mb-2">
          Showing copy saved {new Date(staleSince).toLocaleString('en-US')}.
        </p>
      )}
      {loading && customers.length === 0 && <p className="text-sm text-gray-500">Loading customers…</p>}

      {groups.map(([day, list]) => (
        <section key={day} className="mb-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            {day} · {list.length}
          </h2>
          <ul className="flex flex-col gap-2">
            {list.map((c) => {
              const meta = [
                c.job_title,
                c.duration_label,
                c.visit_interval_weeks > 1 ? `every ${c.visit_interval_weeks} wks` : '',
                c.mower && `mower: ${c.mower}`,
                c.height && `height: ${c.height}`,
                c.billing_plan === 'subscription' && 'monthly subscription',
              ].filter(Boolean)
              return (
                <li key={c.id} className="bg-white rounded-lg border p-3">
                  <div className="flex justify-between gap-2">
                    <div className="font-medium text-gray-900">
                      {c.name || 'Unnamed'}
                      {pendingPatch('customers', c.id) && (
                        <span className="ml-2 text-[11px] font-normal text-amber-700">Waiting for signal</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {showRates && c.default_rate > 0 && (
                        <span className="text-sm text-gray-600">${Number(c.default_rate).toFixed(2)}</span>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => setEditing({ mode: 'edit', customer: c })}
                          className="text-sm underline"
                          style={{ color: 'var(--hunter)' }}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                  {meta.length > 0 && <div className="text-xs text-gray-500 mt-0.5">{meta.join(' · ')}</div>}
                  {c.details && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{c.details}</p>}
                  <div className="flex gap-4 mt-2 text-sm" style={{ color: 'var(--hunter)' }}>
                    {c.address && <a href={mapsUrl(c.address)}>{c.address}</a>}
                    {c.phone && (
                      <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} className="shrink-0">
                        Call
                      </a>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      {editing && (
        <CustomerForm
          key={editing.mode === 'edit' ? editing.customer.id : 'new'}
          customer={editing.mode === 'edit' ? editing.customer : BLANK_CUSTOMER}
          showRates={showRates}
          onSave={save}
          onDelete={editing.mode === 'edit' ? () => remove(editing.customer.id) : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
