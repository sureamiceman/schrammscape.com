// =============================================================================
// MILEAGE — lib/app/mileage.ts
// =============================================================================
// WHAT THIS FILE DOES:
//   The web version of the iPhone app's MileageLogger: when a job is
//   completed, log the business-driving leg from the day's previous stop to
//   that job (road miles), for the tax mileage summaries in Billing.
//
//   Same rules as the iPhone app:
//     - one entry per job (checked by event_identifier)
//     - both stops need map coordinates (latitude/longitude, which the
//       iPhone app fills in); the first job of the day has no leg
//     - road distance from a directions service; if that service can't be
//       reached, the straight-line distance is used so the leg still counts
//
//   Road distance comes from the free public OSRM service
//   (router.project-osrm.org), since Apple's directions aren't available
//   to web pages without extra setup. Only the two stops' coordinates are
//   sent to it, never names or addresses.
//
//   buildLeg() is called on Complete; the leg then waits in the outbox
//   (lib/app/pendingChanges.ts), which calls sendLeg() once there's signal.
// =============================================================================

import { supabase } from '@/lib/supabaseClient'

export interface MileageLeg {
  jobId: string
  eventIdentifier: string
  date: string
  fromLabel: string
  toLabel: string
  from: [number, number] // [latitude, longitude]
  to: [number, number]
}

interface Stop {
  id: string
  customer_name: string
  address: string
  scheduled_start: string
  latitude: number | null
  longitude: number | null
  assigned_to: string | null
  event_identifier: string | null
}

const label = (s: Stop) => s.customer_name || s.address

/**
 * The leg that reached `job`, or null when there isn't one to log.
 * `dayJobs` is the rest of that day's list; only the same person's jobs
 * count as their previous stop.
 */
export function buildLeg(job: Stop, dayJobs: Stop[], endedAt: string): MileageLeg | null {
  if (job.latitude == null || job.longitude == null) return null
  const previous = dayJobs
    .filter(
      (j) =>
        j.id !== job.id &&
        j.assigned_to === job.assigned_to &&
        j.scheduled_start < job.scheduled_start &&
        j.latitude != null &&
        j.longitude != null
    )
    .sort((a, b) => b.scheduled_start.localeCompare(a.scheduled_start))[0]
  if (!previous) return null
  return {
    jobId: job.id,
    eventIdentifier: job.event_identifier ?? job.id,
    date: endedAt,
    fromLabel: label(previous),
    toLabel: label(job),
    from: [previous.latitude!, previous.longitude!],
    to: [job.latitude, job.longitude],
  }
}

/** Straight-line distance in meters (same fallback as the iPhone app). */
function straightLineMeters([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]) {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

async function roadMeters(from: [number, number], to: [number, number]) {
  try {
    const coords = `${from[1]},${from[0]};${to[1]},${to[0]}` // OSRM wants longitude first
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`, {
      signal: AbortSignal.timeout(8000),
    })
    const body = await res.json()
    const meters = body?.routes?.[0]?.distance
    if (body?.code === 'Ok' && typeof meters === 'number') return meters
  } catch {
    /* unreachable or throttled: fall through */
  }
  return straightLineMeters(from, to)
}

/**
 * Saves the leg to mileage_entries. Throws if Supabase can't be reached or
 * refuses it; the outbox decides whether to retry or report.
 */
export async function sendLeg(leg: MileageLeg): Promise<void> {
  const { data: existing, error: lookupError } = await supabase
    .from('mileage_entries')
    .select('id')
    .eq('event_identifier', leg.eventIdentifier)
    .is('deleted_at', null)
    .limit(1)
  if (lookupError) throw new Error(lookupError.message)
  if (existing.length) return // already logged (by this app or the iPhone)

  const miles = (await roadMeters(leg.from, leg.to)) / 1609.344
  if (!(miles > 0)) return

  const { data: auth } = await supabase.auth.getSession()
  const { error } = await supabase.from('mileage_entries').upsert(
    {
      // The job's id doubles as the entry's id, so a retry can never log the leg twice.
      id: leg.jobId,
      date: leg.date,
      from_label: leg.fromLabel,
      to_label: leg.toLabel,
      miles: Math.round(miles * 100) / 100,
      event_identifier: leg.eventIdentifier,
      user_id: auth.session?.user.id ?? null,
    },
    { onConflict: 'id', ignoreDuplicates: true }
  )
  if (error) throw new Error(`Mileage: ${error.message}`)
}
