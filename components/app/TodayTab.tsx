// =============================================================================
// TODAY TAB — components/app/TodayTab.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   The web version of the iPhone app's "My Day": the jobs (work_records)
//   scheduled for a chosen day, in time order, with tap-to-navigate and
//   tap-to-call. Arrows step to other days.
//
//   Crew only ever receive their own assigned jobs (database rule);
//   admin/manager see everyone's, with the assigned person's name.
//
//   READ-ONLY for now: check-in / complete arrive in the next phase, once
//   they're tested side by side with the iPhone app's sync.
// =============================================================================

'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { loadCached, saveCached } from '@/lib/app/offlineCache'
import type { Profile } from './AppShell'

export interface WorkRecordRow {
  id: string
  customer_name: string
  address: string
  job_title: string
  phone: string
  notes: string
  scheduled_start: string
  scheduled_end: string
  actual_start: string | null
  actual_end: string | null
  status: string
  assigned_to: string | null
}

const STATUS: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-gray-100 text-gray-700' },
  inProgress: { label: 'In progress', className: 'bg-amber-100 text-amber-800' },
  completed: { label: 'Done', className: 'bg-green-100 text-green-800' },
  skipped: { label: 'Skipped', className: 'bg-gray-100 text-gray-500 line-through' },
}

const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
const dayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}
export function mapsUrl(address: string) {
  return `https://maps.apple.com/?daddr=${encodeURIComponent(address)}`
}

export default function TodayTab({ profiles, showAssignee }: { profiles: Profile[]; showAssignee: boolean }) {
  const [day, setDay] = useState(() => startOfDay(new Date()))
  const [jobs, setJobs] = useState<WorkRecordRow[]>([])
  const [loading, setLoading] = useState(true)
  const [staleSince, setStaleSince] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const cacheKey = `jobs:${dayKey(day)}`
    const cached = loadCached<WorkRecordRow[]>(cacheKey)
    if (cached) setJobs(cached.data)
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('work_records')
      .select(
        'id, customer_name, address, job_title, phone, notes, scheduled_start, scheduled_end, actual_start, actual_end, status, assigned_to'
      )
      .is('deleted_at', null)
      .gte('scheduled_start', day.toISOString())
      .lt('scheduled_start', addDays(day, 1).toISOString())
      .order('scheduled_start', { ascending: true })
    setLoading(false)
    if (error || !data) {
      setStaleSince(cached?.savedAt ?? null)
      if (!cached) setJobs([])
      setError(error?.message ?? 'Could not load jobs.')
      return
    }
    setJobs(data as WorkRecordRow[])
    setStaleSince(null)
    saveCached(cacheKey, data)
  }, [day])

  useEffect(() => {
    load()
  }, [load])

  const isToday = dayKey(day) === dayKey(new Date())
  const done = jobs.filter((j) => j.status === 'completed').length
  const nameFor = (id: string | null) => profiles.find((p) => p.user_id === id)?.display_name

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setDay(addDays(day, -1))} className="p-2 text-xl text-gray-500" aria-label="Previous day">
          ‹
        </button>
        <button onClick={() => setDay(startOfDay(new Date()))} className="text-center">
          <div className="font-semibold text-gray-900">{isToday ? 'Today' : dayFmt.format(day)}</div>
          <div className="text-xs text-gray-500">
            {isToday ? dayFmt.format(day) : 'Tap for today'}
            {jobs.length > 0 && ` · ${done}/${jobs.length} done`}
          </div>
        </button>
        <button onClick={() => setDay(addDays(day, 1))} className="p-2 text-xl text-gray-500" aria-label="Next day">
          ›
        </button>
      </div>

      {staleSince && (
        <p className="text-xs text-amber-700 mb-2">
          Showing copy saved {new Date(staleSince).toLocaleString('en-US')}.
        </p>
      )}
      {error && !staleSince && <p className="text-sm text-red-600 mb-2">{error}</p>}
      {loading && jobs.length === 0 && <p className="text-sm text-gray-500">Loading jobs…</p>}
      {!loading && jobs.length === 0 && !error && (
        <p className="text-sm text-gray-500 text-center py-10">No jobs scheduled.</p>
      )}

      <ul className="flex flex-col gap-3">
        {jobs.map((job) => {
          const s = STATUS[job.status] ?? STATUS.scheduled
          const who = showAssignee ? nameFor(job.assigned_to) : undefined
          return (
            <li key={job.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">
                    {timeFmt.format(new Date(job.scheduled_start))} – {timeFmt.format(new Date(job.scheduled_end))}
                    {who && ` · ${who}`}
                  </div>
                  <div className="font-semibold text-gray-900 truncate">{job.customer_name || 'Untitled job'}</div>
                  {job.job_title && <div className="text-sm text-gray-600">{job.job_title}</div>}
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${s.className}`}>{s.label}</span>
              </div>
              {job.notes && <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{job.notes}</p>}
              <div className="flex gap-2 mt-3">
                {job.address && (
                  <a
                    href={mapsUrl(job.address)}
                    className="flex-1 text-center text-sm rounded-md border py-2"
                    style={{ color: 'var(--hunter)' }}
                  >
                    Directions
                  </a>
                )}
                {job.phone && (
                  <a
                    href={`tel:${job.phone.replace(/[^\d+]/g, '')}`}
                    className="flex-1 text-center text-sm rounded-md border py-2"
                    style={{ color: 'var(--hunter)' }}
                  >
                    Call
                  </a>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <button onClick={load} className="w-full text-sm text-gray-500 mt-4 py-2">
        {loading ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
  )
}
