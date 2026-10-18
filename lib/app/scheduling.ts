// =============================================================================
// SCHEDULING — lib/app/scheduling.ts
// =============================================================================
// WHAT THIS FILE DOES:
//   The brains of the Schedule tab, ported from the iPhone app's
//   ScheduleBuilderModel, RouteOptimizer, TimeSlot and ICSBuilder:
//     - which customers are due on a given day (weekday + visit frequency)
//     - drive times between stops (OSRM, straight-line fallback)
//     - the best visiting order (nearest-neighbor, then 2-opt)
//     - chaining start/end times through the day
//     - the job notes template and an .ics calendar file
//
//   No screens and no database writes here; ScheduleTab.tsx uses these.
// =============================================================================

// ------------------------------------------------------------- time slots
// Working hours 7 AM – 9 PM in 15-minute steps (same as the iPhone app).
export const START_MINUTES = 7 * 60
export const MAX_START_MINUTES = 20 * 60
export const SLOT_INCREMENT = 15
export const DEFAULT_DURATION_MINUTES = 45

export const startSlots = Array.from(
  { length: (MAX_START_MINUTES - START_MINUTES) / SLOT_INCREMENT + 1 },
  (_, i) => START_MINUTES + i * SLOT_INCREMENT
)

/** 24-hour "HH:mm" (the crew always uses military time). */
export function hhmm(totalMinutes: number) {
  const t = Math.max(0, totalMinutes)
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

/** Now rounded up to the next slot, clamped to working hours. */
export function defaultStartMinutes(now = new Date()) {
  const mins = now.getHours() * 60 + now.getMinutes()
  const rounded = Math.ceil(mins / SLOT_INCREMENT) * SLOT_INCREMENT
  return Math.min(Math.max(rounded, START_MINUTES), MAX_START_MINUTES)
}

/** A day (any time on it) plus minutes after midnight, as a Date. */
export function atMinutes(day: Date, minutes: number) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60)
}

/** "60" -> 60; blank or "TBD" -> null. */
export function parseDurationMinutes(label: string) {
  const t = label.trim()
  if (!t || t.toLowerCase() === 'tbd') return null
  const value = Number(t)
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null
}

// ------------------------------------------------------- who is due today
const WEEKDAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

/** "MON".."SUN" for a date, matching customers.day_of_week. */
export function weekdayCode(date: Date) {
  return WEEKDAY_CODES[date.getDay()]
}

/** Matches "FRI", "Fri", "friday"... to a weekday code. */
export function sameWeekday(dayOfWeek: string, code: string) {
  return dayOfWeek.trim().slice(0, 3).toUpperCase() === code
}

/**
 * Weekly customers are always due; longer cadences once enough time has
 * passed since the last visit, with a 3-day grace so a Monday-to-Monday
 * cadence never slips a week.
 */
export function visitIsDue(intervalWeeks: number, lastVisit: Date | null, day: Date) {
  if (intervalWeeks <= 1 || !lastVisit) return true
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOf(day) - startOf(lastVisit)) / 86400000)
  return days >= intervalWeeks * 7 - 3
}

/** Notes attached to every job; "Unknown" fills any gaps. */
export function notesTemplate(c: { phone: string; mower: string; height: string; details: string }) {
  return [
    `Phone: ${c.phone || 'Unknown'}`,
    `Mower: ${c.mower || 'Unknown'}`,
    `Height: ${c.height || 'Unknown'}`,
    `Additional Info: ${c.details}`,
  ].join('\n')
}

// ------------------------------------------------------------ drive times
export type LatLon = [number, number] // [latitude, longitude]

function straightLineMeters([lat1, lon1]: LatLon, [lat2, lon2]: LatLon) {
  const rad = Math.PI / 180
  const h =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

export interface DriveMatrix {
  /** Drive time in seconds, [from][to]. */
  seconds: number[][]
  /** Road distance in meters, [from][to]. */
  meters: number[][]
  /** True when the road service couldn't be reached and straight lines were used. */
  estimated: boolean
}

/**
 * Drive time and road distance between every pair of points, from one
 * request to the free OSRM service, which routes over the OpenStreetMap
 * road network (coordinates only are sent; no live traffic). If it can't be
 * reached, falls back to 30 mph over the straight-line distance, like the
 * iPhone app, and says so via `estimated`.
 */
export async function driveMatrix(points: LatLon[]): Promise<DriveMatrix> {
  try {
    const coords = points.map(([lat, lon]) => `${lon},${lat}`).join(';')
    const res = await fetch(`https://router.project-osrm.org/table/v1/driving/${coords}?annotations=duration,distance`, {
      signal: AbortSignal.timeout(10000),
    })
    const body = await res.json()
    const d = body?.durations as (number | null)[][] | undefined
    const m = body?.distances as (number | null)[][] | undefined
    if (body?.code === 'Ok' && d?.length === points.length && m?.length === points.length) {
      // Symmetrize (the optimizer assumes A->B == B->A) and patch any gaps.
      const sym = (t: (number | null)[][], gap: (a: LatLon, b: LatLon) => number) =>
        points.map((a, i) =>
          points.map((b, j) => {
            const ab = t[i][j]
            const ba = t[j][i]
            if (ab != null && ba != null) return (ab + ba) / 2
            return ab ?? ba ?? gap(a, b)
          })
        )
      return {
        seconds: sym(d, (a, b) => straightLineMeters(a, b) / 13.4),
        meters: sym(m, straightLineMeters),
        estimated: false,
      }
    }
  } catch {
    /* unreachable or throttled: fall through */
  }
  const meters = points.map((a) => points.map((b) => straightLineMeters(a, b)))
  return { seconds: meters.map((row) => row.map((v) => v / 13.4)), meters, estimated: true }
}

/**
 * Google Maps directions links for the day, in visiting order. Phones'
 * browsers allow only 3 stops between start and end, so long days are
 * split into consecutive links (each one starts where the last ended).
 */
export function googleMapsRouteLinks(start: LatLon | null, stops: LatLon[]) {
  const pts = (start ? [start, ...stops] : stops).map(([lat, lon]) => `${lat.toFixed(6)},${lon.toFixed(6)}`)
  const links: { from: number; to: number; url: string }[] = []
  const offset = start ? 0 : 1 // stop numbers shown to the user start at 1
  for (let i = 0; i < pts.length - 1; i += 4) {
    const chunk = pts.slice(i, i + 5)
    const url = new URL('https://www.google.com/maps/dir/')
    url.searchParams.set('api', '1')
    url.searchParams.set('origin', chunk[0])
    url.searchParams.set('destination', chunk[chunk.length - 1])
    if (chunk.length > 2) url.searchParams.set('waypoints', chunk.slice(1, -1).join('|'))
    url.searchParams.set('travelmode', 'driving')
    links.push({ from: i + offset, to: i + chunk.length - 1 + offset, url: url.toString() })
  }
  return links
}

// ----------------------------------------------------------- route order
/**
 * Best visiting order of stops 1..n starting from point 0, for an
 * open-ended route (no return trip). Nearest-neighbor, then 2-opt.
 * Returns the stop indices (1-based, matching the matrix) in order.
 */
export function optimizeOrder(matrix: number[][]): number[] {
  const n = matrix.length - 1
  if (n <= 1) return n === 1 ? [1] : []
  const cost = (order: number[]) => {
    let total = 0
    let current = 0
    for (const i of order) {
      total += matrix[current][i]
      current = i
    }
    return total
  }
  const remaining = new Set(Array.from({ length: n }, (_, i) => i + 1))
  let order: number[] = []
  let current = 0
  while (remaining.size) {
    let next = -1
    remaining.forEach((i) => {
      if (next === -1 || matrix[current][i] < matrix[current][next]) next = i
    })
    remaining.delete(next)
    order.push(next)
    current = next
  }
  let improved = true
  while (improved) {
    improved = false
    for (let i = 0; i < order.length - 1; i++) {
      for (let j = i + 1; j < order.length; j++) {
        const candidate = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)]
        if (cost(candidate) + 1 < cost(order)) {
          order = candidate
          improved = true
        }
      }
    }
  }
  return order
}

// ---------------------------------------------------------- time chaining
export interface ChainStop {
  durationMinutes: number
  /** Drive seconds from the previous stop (or the start point for the first). */
  driveSeconds: number | null
}

/**
 * First job starts at `startMinutes`; each later job starts at the previous
 * job's end plus the drive, rounded up to 5 minutes (minimum 5). The first
 * job's drive is shown for information only.
 */
export function chainTimes(stops: ChainStop[], startMinutes: number) {
  let cursor = startMinutes
  return stops.map((s, i) => {
    const driveMinutes = s.driveSeconds == null ? null : Math.max(5, Math.ceil(s.driveSeconds / 60 / 5) * 5)
    if (i > 0 && driveMinutes != null) cursor += driveMinutes
    const start = cursor
    cursor += s.durationMinutes
    return { start, end: cursor, driveMinutes }
  })
}

// --------------------------------------------------------------- calendar
export interface CalendarEvent {
  title: string
  location: string
  notes: string
  start: Date
  end: Date
}

const icsEscape = (v: string) => v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
const pad = (n: number) => String(n).padStart(2, '0')
const localStamp = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')

/** An .ics file for adding the day's jobs to any calendar app (port of ICSBuilder). */
export function buildIcs(events: CalendarEvent[], timeZone = 'America/New_York') {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SchrammScape//Crew App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Schrammscape',
    `X-WR-TIMEZONE:${timeZone}`,
  ]
  const stamp = utcStamp(new Date())
  events.forEach((e, i) => {
    const slug = e.title.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const desc = [e.notes, e.location ? `Location: ${e.location}` : ''].filter(Boolean).join('\n')
    lines.push(
      'BEGIN:VEVENT',
      `UID:${slug}-${localStamp(e.start)}-${i}@schrammscape.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${timeZone}:${localStamp(e.start)}`,
      `DTEND;TZID=${timeZone}:${localStamp(e.end)}`,
      `SUMMARY:${icsEscape(e.title)}`,
      ...(e.location ? [`LOCATION:${icsEscape(e.location)}`] : []),
      ...(desc ? [`DESCRIPTION:${icsEscape(desc)}`] : []),
      'END:VEVENT'
    )
  })
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}
