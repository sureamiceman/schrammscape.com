// =============================================================================
// CUSTOMERS TAB — components/app/CustomersTab.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   The customer list from the shared database, grouped by mowing day, with
//   search, tap-to-navigate and tap-to-call. Rates are shown to
//   admin/manager only.
//
//   READ-ONLY for now: adding/editing customers comes in a later phase.
// =============================================================================

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { loadCached, saveCached } from '@/lib/app/offlineCache'
import { mapsUrl } from './TodayTab'

interface CustomerRow {
  id: string
  name: string
  address: string
  job_title: string
  duration_label: string
  day_of_week: string
  mower: string
  details: string
  phone: string
  height: string
  default_rate: number
  visit_interval_weeks: number
  sort_order: number
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
function dayRank(day: string) {
  const i = DAYS.findIndex((d) => day.trim().toLowerCase().startsWith(d.slice(0, 3)))
  return i === -1 ? 99 : i
}

export default function CustomersTab({ showRates }: { showRates: boolean }) {
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [staleSince, setStaleSince] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    const cached = loadCached<CustomerRow[]>('customers')
    if (cached) setCustomers(cached.data)
    setLoading(true)
    const { data, error } = await supabase
      .from('customers')
      .select(
        'id, name, address, job_title, duration_label, day_of_week, mower, details, phone, height, default_rate, visit_interval_weeks, sort_order'
      )
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    setLoading(false)
    if (error || !data) {
      setStaleSince(cached?.savedAt ?? null)
      return
    }
    setCustomers(data as CustomerRow[])
    setStaleSince(null)
    saveCached('customers', data)
  }, [])

  useEffect(() => {
    load()
  }, [load])

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
      <input
        type="search"
        placeholder={`Search ${customers.length} customers`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full border rounded-md px-3 py-2 text-base mb-3 bg-white"
      />
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
              ].filter(Boolean)
              return (
                <li key={c.id} className="bg-white rounded-lg border p-3">
                  <div className="flex justify-between gap-2">
                    <div className="font-medium text-gray-900">{c.name || 'Unnamed'}</div>
                    {showRates && c.default_rate > 0 && (
                      <div className="text-sm text-gray-600">${Number(c.default_rate).toFixed(2)}</div>
                    )}
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
    </div>
  )
}
