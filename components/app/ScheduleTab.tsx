// =============================================================================
// SCHEDULE TAB — components/app/ScheduleTab.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   Builds a day of jobs, the web version of the iPhone app's Schedule tab
//   (admin/manager only):
//     1. Day      date, first start time, and who works it
//     2. Stops    customers for that weekday, pre-ticked when their visit is
//                 due; ones already on that day are flagged and left unticked
//     3. Route    best order from where you are now, using real road drive
//                 times and miles (OSRM over OpenStreetMap roads), with times
//                 chained through the day; reorder or drop stops, change the
//                 start time, or open the route in Google Maps to check it
//     4. Save     creates the jobs (work_records) so they show on Today, on
//                 the crew member's phone, and in the iPhone app's My Day;
//                 then offers an .ics file to add them to a calendar
//
//   DIFFERENCE FROM THE IPHONE APP:
//   Jobs are saved straight to the database, not to a phone calendar, and
//   are saved with NO event_identifier. That matters: the iPhone app deletes
//   open jobs whose calendar event it can't find, so a made-up identifier
//   would get these jobs wiped. Add-on services aren't included yet.
//
// DEPENDS ON:
//   lib/app/scheduling.ts (logic), lib/app/geocode.ts,
//   lib/app/pendingChanges.ts (saving, works offline)
// =============================================================================

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { loadCached, saveCached } from '@/lib/app/offlineCache'
import { geocode } from '@/lib/app/geocode'
import { queueChange } from '@/lib/app/pendingChanges'
import {
  DEFAULT_DURATION_MINUTES,
  atMinutes,
  buildIcs,
  chainTimes,
  defaultStartMinutes,
  driveMatrix,
  googleMapsRouteLinks,
  hhmm,
  notesTemplate,
  optimizeOrder,
  parseDurationMinutes,
  sameWeekday,
  startSlots,
  visitIsDue,
  weekdayCode,
  type LatLon,
} from '@/lib/app/scheduling'
import type { Profile } from './AppShell'
import type { CustomerRow } from './CustomersTab'

type Step = 'day' | 'stops' | 'route' | 'saved'

interface Stop {
  customer: CustomerRow
  durationMinutes: number
  estimated: boolean // duration was blank/TBD, so the default was used
  matrixIndex: number // row in the drive-time matrix
}

const CUSTOMER_COLUMNS =
  'id, name, address, job_title, duration_label, day_of_week, mower, details, phone, email, height, default_rate, visit_interval_weeks, sort_order, latitude, longitude, geocode_status'

const dayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fromDateInput = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const workLabel = (mins: number) => `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** The phone's current position, or null if denied/unavailable. */
function currentPosition(): Promise<LatLon | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve([p.coords.latitude, p.coords.longitude]),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  })
}

export default function ScheduleTab({ profiles, myId }: { profiles: Profile[]; myId: string }) {
  const [step, setStep] = useState<Step>('day')
  const [day, setDay] = useState(() => new Date())
  const [startMin, setStartMin] = useState(() => defaultStartMinutes())
  const [assignee, setAssignee] = useState(myId)
  const [customers, setCustomers] = useState<CustomerRow[]>(() => loadCached<CustomerRow[]>('customers')?.data ?? [])
  const [lastVisit, setLastVisit] = useState<Map<string, Date>>(new Map())
  const [alreadyThatDay, setAlreadyThatDay] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)
  const [stops, setStops] = useState<Stop[]>([])
  const [matrix, setMatrix] = useState<number[][]>([])
  const [meters, setMeters] = useState<number[][]>([])
  const [startPoint, setStartPoint] = useState<LatLon | null>(null)
  const hasStartPoint = !!startPoint
  const [approximate, setApproximate] = useState<string[]>([])
  const [estimatedDrive, setEstimatedDrive] = useState(false)
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedEvents, setSavedEvents] = useState<{ count: number; ics: string } | null>(null)

  const code = weekdayCode(day)

  // Step 1 -> 2: load customers plus visit history for the chosen day.
  const loadStops = useCallback(async () => {
    setError(null)
    setWorking('Loading customers…')
    const dayStart = atMinutes(day, 0)
    const dayEnd = atMinutes(new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1), 0)
    const [cust, history, sameDay] = await Promise.all([
      supabase.from('customers').select(CUSTOMER_COLUMNS).is('deleted_at', null).order('sort_order').order('name'),
      supabase
        .from('work_records')
        .select('customer_name, scheduled_start')
        .is('deleted_at', null)
        .lt('scheduled_start', dayStart.toISOString())
        .order('scheduled_start', { ascending: false })
        .limit(5000),
      supabase
        .from('work_records')
        .select('customer_name')
        .is('deleted_at', null)
        .gte('scheduled_start', dayStart.toISOString())
        .lt('scheduled_start', dayEnd.toISOString()),
    ])
    setWorking(null)
    if (cust.error || history.error || sameDay.error) {
      setError('Needs signal to load customers and visit history. Try again when you have service.')
      return
    }
    const list = cust.data as CustomerRow[]
    setCustomers(list)
    saveCached('customers', list)

    const last = new Map<string, Date>()
    for (const r of history.data) if (!last.has(r.customer_name)) last.set(r.customer_name, new Date(r.scheduled_start))
    const taken = new Set(sameDay.data.map((r) => r.customer_name))
    setLastVisit(last)
    setAlreadyThatDay(taken)
    setSelected(
      new Set(
        list
          .filter(
            (c) =>
              sameWeekday(c.day_of_week, code) &&
              !taken.has(c.name) &&
              visitIsDue(c.visit_interval_weeks, last.get(c.name) ?? null, day)
          )
          .map((c) => c.id)
      )
    )
    setShowAll(false)
    setStep('stops')
  }, [day, code])

  // Step 2 -> 3: locate every stop, get drive times, find the best order.
  const buildRoute = async () => {
    setError(null)
    const chosen = customers.filter((c) => selected.has(c.id))
    if (!chosen.length) return setError('Select at least one customer.')

    // Every stop needs coordinates; look up any that were never validated.
    const located = [...chosen]
    const rough: string[] = []
    const missing = located.filter((c) => c.latitude == null && c.address.trim())
    for (let i = 0; i < missing.length; i++) {
      const c = missing[i]
      setWorking(`Checking addresses… ${i + 1}/${missing.length}`)
      if (i > 0) await wait(1100) // OpenStreetMap allows about one lookup per second
      const hit = await geocode(c.address)
      if (hit) {
        if (hit.precision !== 'address') rough.push(`${c.name || c.address} (${hit.precision} only)`)
        const coords = { latitude: hit.latitude, longitude: hit.longitude, geocode_status: 'valid' }
        located[located.indexOf(c)] = { ...c, ...coords }
        queueChange('customers', c.id, coords) // remember them on the customer, like the iPhone app
      }
    }
    const unlocatable = located.filter((c) => c.latitude == null || c.longitude == null).map((c) => c.name || c.address)
    if (unlocatable.length) {
      setWorking(null)
      return setError(`Maps can't locate: ${unlocatable.join(', ')}. Fix those addresses in the Customers tab, then try again.`)
    }

    setWorking('Getting your location…')
    const here = await currentPosition()
    setWorking('Calculating drive times…')
    const points: LatLon[] = located.map((c) => [c.latitude!, c.longitude!])
    // Point 0 is where the day starts. Without a location, use a "start" that
    // is zero distance from every stop, so the route can begin anywhere.
    const road = await driveMatrix(here ? [here, ...points] : points)
    const pad = (m: number[][]) => (here ? m : [new Array(points.length + 1).fill(0), ...m.map((row) => [0, ...row])])
    const full = pad(road.seconds)

    const order = optimizeOrder(full)
    setMatrix(full)
    setMeters(pad(road.meters))
    setStartPoint(here)
    setEstimatedDrive(road.estimated)
    setApproximate(rough)
    setStops(
      order.map((idx) => {
        const c = located[idx - 1]
        const parsed = parseDurationMinutes(c.duration_label)
        return { customer: c, durationMinutes: parsed ?? DEFAULT_DURATION_MINUTES, estimated: parsed == null, matrixIndex: idx }
      })
    )
    setWorking(null)
    setStep('route')
  }

  const times = useMemo(
    () =>
      chainTimes(
        stops.map((s, i) => ({
          durationMinutes: s.durationMinutes,
          driveSeconds: i === 0 && !hasStartPoint ? null : matrix[i === 0 ? 0 : stops[i - 1].matrixIndex]?.[s.matrixIndex] ?? null,
        })),
        startMin
      ),
    [stops, matrix, hasStartPoint, startMin]
  )

  /** Road miles into stop i (from the previous stop, or from the start point). */
  const legMiles = (i: number) =>
    i === 0 && !hasStartPoint ? null : (meters[i === 0 ? 0 : stops[i - 1].matrixIndex]?.[stops[i].matrixIndex] ?? 0) / 1609.344
  const totalMiles = stops.reduce((t, _, i) => (i === 0 ? t : t + (legMiles(i) ?? 0)), 0)
  const mapLinks = useMemo(
    () => googleMapsRouteLinks(startPoint, stops.map((s) => [s.customer.latitude!, s.customer.longitude!] as LatLon)),
    [startPoint, stops]
  )

  const lastEnd = times.length ? times[times.length - 1].end : 0
  const work = stops.reduce((t, s) => t + s.durationMinutes, 0)
  const drive = times.slice(1).reduce((t, x) => t + (x.driveMinutes ?? 0), 0)

  const move = (i: number, by: -1 | 1) =>
    setStops((prev) => {
      const next = [...prev]
      ;[next[i], next[i + by]] = [next[i + by], next[i]]
      return next
    })
  const remove = (i: number) => setStops((prev) => prev.filter((_, j) => j !== i))

  // Step 3 -> 4: create the jobs.
  const save = () => {
    setError(null)
    if (!stops.length) return setError('Add at least one stop.')
    if (lastEnd > 24 * 60) return setError('This day runs past midnight. Remove a stop or start earlier.')
    const events = stops.map((s, i) => {
      const c = s.customer
      const start = atMinutes(day, times[i].start)
      const end = atMinutes(day, times[i].end)
      const title = c.job_title || c.name
      const notes = notesTemplate(c)
      queueChange(
        'work_records',
        crypto.randomUUID(),
        {
          customer_name: c.name || title,
          address: c.address,
          job_title: title,
          phone: c.phone,
          notes,
          scheduled_start: start.toISOString(),
          scheduled_end: end.toISOString(),
          status: 'scheduled',
          planned_duration_minutes: s.durationMinutes,
          services_performed: [],
          latitude: c.latitude,
          longitude: c.longitude,
          assigned_to: assignee || null,
          event_identifier: null, // see the note at the top of this file
        },
        { insert: true }
      )
      return { title, location: c.address, notes, start, end }
    })
    setSavedEvents({ count: events.length, ics: buildIcs(events) })
    setStep('saved')
  }

  const downloadIcs = () => {
    if (!savedEvents) return
    const url = URL.createObjectURL(new Blob([savedEvents.ics], { type: 'text/calendar' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `schrammscape-${toDateInput(day)}.ics`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const reset = () => {
    setStep('day')
    setStops([])
    setSelected(new Set())
    setSavedEvents(null)
    setError(null)
    setStartMin(defaultStartMinutes())
  }

  // Customers listed in step 2: that weekday's, plus any ticked; or all.
  const listed = useMemo(() => {
    const list = showAll ? customers : customers.filter((c) => sameWeekday(c.day_of_week, code) || selected.has(c.id))
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [customers, showAll, code, selected])

  useEffect(() => setAssignee((a) => a || myId), [myId])

  const primary = 'w-full rounded-md py-2.5 font-semibold text-white disabled:opacity-50'
  const input = 'w-full rounded-md border px-3 py-2 text-base bg-white'
  const nameFor = (id: string) => profiles.find((p) => p.user_id === id)?.display_name

  return (
    <div>
      <Steps step={step} />
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {working && <p className="text-sm text-gray-500 mb-3">{working}</p>}

      {step === 'day' && (
        <div className="bg-white rounded-lg border p-4 flex flex-col gap-4">
          <label className="block">
            <span className="block text-xs text-gray-500 mb-1">Day</span>
            <input type="date" className={input} value={toDateInput(day)} onChange={(e) => e.target.value && setDay(fromDateInput(e.target.value))} />
            <span className="block text-xs text-gray-500 mt-1">{dayFmt.format(day)}</span>
          </label>
          <label className="block">
            <span className="block text-xs text-gray-500 mb-1">First job starts</span>
            <select className={input} value={startMin} onChange={(e) => setStartMin(Number(e.target.value))}>
              {startSlots.map((m) => (
                <option key={m} value={m}>
                  {hhmm(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs text-gray-500 mb-1">Who works this day</span>
            <select className={input} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              {profiles.map((p) => (
                <option key={p.user_id} value={p.user_id}>
                  {p.display_name || 'Unnamed'} ({p.role})
                </option>
              ))}
            </select>
          </label>
          <button onClick={loadStops} disabled={!!working} className={primary} style={{ backgroundColor: 'var(--hunter)' }}>
            Next: choose stops
          </button>
        </div>
      )}

      {step === 'stops' && (
        <div>
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-gray-600">
              {dayFmt.format(day)} · {selected.size} selected
            </span>
            <button onClick={() => setShowAll(!showAll)} className="underline" style={{ color: 'var(--hunter)' }}>
              {showAll ? `Only ${code}` : 'Show all customers'}
            </button>
          </div>
          {listed.length === 0 && <p className="text-sm text-gray-500 py-6 text-center">No customers are set to {code}.</p>}
          <ul className="flex flex-col gap-2 mb-4">
            {listed.map((c) => {
              const last = lastVisit.get(c.name)
              const due = visitIsDue(c.visit_interval_weeks, last ?? null, day)
              const notes = [
                parseDurationMinutes(c.duration_label) ? `${parseDurationMinutes(c.duration_label)} min` : 'duration TBD',
                c.visit_interval_weeks > 1 ? `every ${c.visit_interval_weeks} wks${due ? '' : ' · not due'}` : '',
                last ? `last ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : '',
              ].filter(Boolean)
              return (
                <li key={c.id}>
                  <label className="flex items-start gap-3 bg-white rounded-lg border p-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 shrink-0"
                      checked={selected.has(c.id)}
                      onChange={() =>
                        setSelected((prev) => {
                          const next = new Set(prev)
                          if (next.has(c.id)) next.delete(c.id)
                          else next.add(c.id)
                          return next
                        })
                      }
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-gray-900">
                        {c.name || c.job_title || 'Unnamed'}
                        {alreadyThatDay.has(c.name) && <span className="ml-2 text-xs font-normal text-amber-700">already scheduled this day</span>}
                      </span>
                      <span className="block text-xs text-gray-500">{[c.address, ...notes].filter(Boolean).join(' · ')}</span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
          <div className="flex gap-2">
            <button onClick={() => setStep('day')} className="flex-1 rounded-md border bg-white py-2.5">
              Back
            </button>
            <button
              onClick={buildRoute}
              disabled={!!working || !selected.size}
              className={`${primary} flex-[2]`}
              style={{ backgroundColor: 'var(--hunter)' }}
            >
              Build route ({selected.size})
            </button>
          </div>
        </div>
      )}

      {step === 'route' && (
        <div>
          <div className="bg-white rounded-lg border p-3 mb-3 text-sm">
            <div className="font-medium text-gray-900">
              {dayFmt.format(day)} · {nameFor(assignee) ?? 'Unassigned'}
            </div>
            <div className="text-gray-600">
              {stops.length} stop{stops.length === 1 ? '' : 's'} — {workLabel(work)} of work
              {drive > 0 && `, ${drive} min / ${totalMiles.toFixed(1)} mi driving`} · done by {hhmm(lastEnd)}
            </div>
            {estimatedDrive ? (
              <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
                The road-directions service couldn&apos;t be reached, so drive times and miles are straight-line
                estimates and the order may not be the best one.{' '}
                <button onClick={buildRoute} className="underline font-medium">
                  Try road directions again
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                Order and drive times from real road routes (OpenStreetMap roads via OSRM). Typical driving, no live traffic.
              </p>
            )}
            {!hasStartPoint && <p className="text-xs text-amber-700 mt-1">Location unavailable, so the route starts at the first stop.</p>}
            {approximate.length > 0 && (
              <p className="text-xs text-amber-700 mt-1">
                Only roughly located: {approximate.join(', ')}. Fix the address in Customers for an exact route.
              </p>
            )}
            <label className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500">Start at</span>
              <select className="rounded-md border px-2 py-1 bg-white" value={startMin} onChange={(e) => setStartMin(Number(e.target.value))}>
                {startSlots.map((m) => (
                  <option key={m} value={m}>
                    {hhmm(m)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <ol className="flex flex-col gap-2 mb-4">
            {stops.map((s, i) => (
              <li key={s.customer.id}>
                {times[i].driveMinutes != null && (i > 0 || hasStartPoint) && (
                  <div className="text-xs text-gray-400 pl-3 mb-1">
                    ↓ {times[i].driveMinutes} min · {(legMiles(i) ?? 0).toFixed(1)} mi{i === 0 && ' from your location'}
                  </div>
                )}
                <div className="bg-white rounded-lg border p-3 flex items-start gap-3">
                  <div className="text-sm font-semibold tabular-nums w-24 shrink-0" style={{ color: 'var(--hunter)' }}>
                    {hhmm(times[i].start)}–{hhmm(times[i].end)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 truncate">{s.customer.name || s.customer.job_title}</div>
                    <div className="text-xs text-gray-500 truncate">{s.customer.address}</div>
                    <div className="text-xs text-gray-500">
                      {s.durationMinutes} min{s.estimated && ' (estimate: no duration set)'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex gap-1">
                      <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded border px-2 disabled:opacity-30" aria-label="Move up">
                        ↑
                      </button>
                      <button onClick={() => move(i, 1)} disabled={i === stops.length - 1} className="rounded border px-2 disabled:opacity-30" aria-label="Move down">
                        ↓
                      </button>
                    </div>
                    <button onClick={() => remove(i)} className="text-xs text-red-600 underline">
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2 mb-4">
            {mapLinks.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-[45%] text-center text-sm rounded-md border bg-white py-2"
                style={{ color: 'var(--hunter)' }}
              >
                {mapLinks.length === 1
                  ? 'Check route in Google Maps'
                  : `Map: ${l.from === 0 ? 'you' : `stop ${l.from}`} → stop ${l.to}`}
              </a>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep('stops')} className="flex-1 rounded-md border bg-white py-2.5">
              Back
            </button>
            <button onClick={save} disabled={!stops.length} className={`${primary} flex-[2]`} style={{ backgroundColor: 'var(--hunter)' }}>
              Save {stops.length} job{stops.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      )}

      {step === 'saved' && savedEvents && (
        <div className="bg-white rounded-lg border p-4 text-center flex flex-col gap-3">
          <p className="font-semibold text-gray-900">
            ✓ {savedEvents.count} job{savedEvents.count === 1 ? '' : 's'} saved for {dayFmt.format(day)}
          </p>
          <p className="text-sm text-gray-600">
            They&apos;re on the Today tab and {nameFor(assignee) ? `${nameFor(assignee)}'s` : 'the crew'} phone. Without signal they
            send automatically once you&apos;re back online.
          </p>
          <button onClick={downloadIcs} className="w-full rounded-md border py-2.5" style={{ color: 'var(--hunter)' }}>
            Add to calendar (.ics)
          </button>
          <button onClick={reset} className={primary} style={{ backgroundColor: 'var(--hunter)' }}>
            Schedule another day
          </button>
        </div>
      )}
    </div>
  )
}

function Steps({ step }: { step: Step }) {
  const names: [Step, string][] = [
    ['day', 'Day'],
    ['stops', 'Stops'],
    ['route', 'Route'],
    ['saved', 'Saved'],
  ]
  const at = names.findIndex(([s]) => s === step)
  return (
    <ol className="flex gap-1 mb-4 text-xs">
      {names.map(([s, label], i) => (
        <li
          key={s}
          className="flex-1 text-center py-1 rounded"
          style={i <= at ? { backgroundColor: 'var(--hunter)', color: 'white' } : { backgroundColor: '#e5e7eb', color: '#6b7280' }}
        >
          {label}
        </li>
      ))}
    </ol>
  )
}
