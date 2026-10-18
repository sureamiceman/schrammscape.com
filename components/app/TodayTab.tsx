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
//   Each job is a JobCard (check in, complete, extra work). Edits show at
//   once and are sent through lib/app/pendingChanges.ts, which holds them
//   until there's signal. Completing a job also logs the mileage leg from
//   the previous stop (lib/app/mileage.ts), like the iPhone app.
// =============================================================================

'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { loadCached, saveCached } from '@/lib/app/offlineCache'
import { buildLeg } from '@/lib/app/mileage'
import {
  onPendingChange,
  pendingInserts,
  pendingPatch,
  queueChange,
  queueMileage,
  type FlushResult,
} from '@/lib/app/pendingChanges'
import type { Profile } from './AppShell'
import JobCard from './JobCard'

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
  extra_services: string[]
  extra_notes: string
  invoice_number: string | null
  event_identifier: string | null
  latitude: number | null
  longitude: number | null
  /** 'invoice' or 'subscription'; null on older jobs, which means invoice. */
  billing: 'invoice' | 'subscription' | null
  /** When the "work completed" text was sent (subscription jobs). */
  notice_sent_at: string | null
}

const JOB_COLUMNS =
  'id, customer_name, address, job_title, phone, notes, scheduled_start, scheduled_end, actual_start, actual_end, status, assigned_to, extra_services, extra_notes, invoice_number, event_identifier, latitude, longitude, billing, notice_sent_at'

/**
 * Lays edits that haven't reached the database yet over freshly loaded rows,
 * and adds that day's unsent new jobs (e.g. scheduled with no signal).
 */
function withPending(rows: WorkRecordRow[], dayStart: Date, dayEnd: Date): WorkRecordRow[] {
  const merged = rows.map((r) => ({ ...r, ...(pendingPatch('work_records', r.id) as Partial<WorkRecordRow>) }))
  const ids = new Set(rows.map((r) => r.id))
  const blank = {
    actual_start: null,
    actual_end: null,
    extra_services: [],
    extra_notes: '',
    invoice_number: null,
    billing: null,
    notice_sent_at: null,
  }
  const added = (pendingInserts('work_records').map((r) => ({ ...blank, ...r })) as unknown as WorkRecordRow[]).filter((r) => {
    const t = new Date(r.scheduled_start).getTime()
    return !ids.has(r.id) && t >= dayStart.getTime() && t < dayEnd.getTime()
  })
  return [...merged, ...added].sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start))
}

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
  const [extraJobNames, setExtraJobNames] = useState<string[]>(() => loadCached<string[]>('extraJobNames')?.data ?? [])
  const [, setPendingTick] = useState(0)

  const load = useCallback(async () => {
    const cacheKey = `jobs:${dayKey(day)}`
    const cached = loadCached<WorkRecordRow[]>(cacheKey)
    const dayEnd = addDays(day, 1)
    if (cached) setJobs(withPending(cached.data, day, dayEnd))
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('work_records')
      .select(JOB_COLUMNS)
      .is('deleted_at', null)
      .gte('scheduled_start', day.toISOString())
      .lt('scheduled_start', addDays(day, 1).toISOString())
      .order('scheduled_start', { ascending: true })
    setLoading(false)
    if (error || !data) {
      setStaleSince(cached?.savedAt ?? null)
      setJobs(withPending(cached?.data ?? [], day, dayEnd))
      setError(error?.message ?? 'Could not load jobs.')
      return
    }
    const rows = withPending(data as WorkRecordRow[], day, dayEnd)
    setJobs(rows)
    setStaleSince(null)
    saveCached(cacheKey, rows)
  }, [day])

  useEffect(() => {
    load()
  }, [load])

  // Re-render when queued edits are sent, so "Waiting for signal" clears.
  useEffect(() => onPendingChange(() => setPendingTick((n) => n + 1)), [])

  // Catalog of add-on jobs for "+ Add job" (the non-default job types).
  useEffect(() => {
    supabase
      .from('job_types')
      .select('name')
      .is('deleted_at', null)
      .eq('is_default', false)
      .order('sort_order')
      .then(({ data }) => {
        if (!data) return
        const names = data.map((d) => d.name as string).filter(Boolean)
        setExtraJobNames(names)
        saveCached('extraJobNames', names)
      })
  }, [])

  const reportFailures = ({ failed }: FlushResult) => {
    if (failed.length) {
      window.alert(`Couldn't save: ${failed.map((f) => f.message).join('; ')}`)
      load()
    }
  }

  const change = (id: string, patch: Partial<WorkRecordRow>) => {
    const job = jobs.find((j) => j.id === id)
    setJobs((prev) => {
      const next = prev.map((j) => (j.id === id ? { ...j, ...patch } : j))
      saveCached(`jobs:${dayKey(day)}`, next)
      return next
    })
    queueChange('work_records', id, patch).then(reportFailures)
    if (job && patch.status === 'completed' && job.status !== 'completed' && patch.actual_end) {
      const leg = buildLeg(job, jobs, patch.actual_end)
      if (leg) queueMileage(leg).then(reportFailures)
    }
  }


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
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            who={showAssignee ? nameFor(job.assigned_to) : undefined}
            extraJobNames={extraJobNames}
            pending={!!pendingPatch('work_records', job.id)}
            onChange={(patch) => change(job.id, patch)}
          />
        ))}
      </ul>

      <button onClick={load} className="w-full text-sm text-gray-500 mt-4 py-2">
        {loading ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
  )
}
