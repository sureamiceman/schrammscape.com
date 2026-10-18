// =============================================================================
// PENDING CHANGES — lib/app/pendingChanges.ts
// =============================================================================
// WHAT THIS FILE DOES:
//   The crew app's "outbox". Every edit (check in, complete, extra work...)
//   is saved here on the phone first, then sent to Supabase. With no signal
//   the edit simply waits and is sent automatically once the phone is back
//   online (or the next time the app is opened).
//
// HOW IT STAYS FRIENDLY WITH THE IPHONE APP:
//   Only the fields that were actually changed are sent (an UPDATE, never a
//   whole-row upsert). New rows (e.g. a new customer) are created with an
//   upsert on their own fresh id, so a retry can't create a duplicate. The iPhone app's own sync then pulls the new values,
//   because the database bumps updated_at on every write.
//
//   Several edits to the same job while offline are merged into one, with
//   the newest value of each field winning.
//
//   Mileage legs logged on Complete (lib/app/mileage.ts) wait here too, after
//   the completion itself, since measuring the road distance needs signal.
//
// STORAGE:
//   localStorage, wrapped in try/catch like offlineCache.ts. If storage is
//   blocked the edit is still sent straight away; it just can't wait for
//   signal.
// =============================================================================

import { supabase } from '@/lib/supabaseClient'
import { sendLeg, type MileageLeg } from './mileage'

export type Table = 'work_records' | 'customers'

type PendingChange =
  | { table: Table; id: string; patch: Record<string, unknown>; insert?: boolean; queuedAt: string }
  | { table: 'mileage_entries'; id: string; leg: MileageLeg; queuedAt: string }

const KEY = 'ss-app:pending'
const EVENT = 'ss-app:pending-changed'

let memory: PendingChange[] = [] // used only if localStorage is unavailable
let flushing: Promise<FlushResult> | null = null

function read(): PendingChange[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return memory
  }
}

function write(list: PendingChange[]) {
  memory = list
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* storage blocked: keep the in-memory copy */
  }
  window.dispatchEvent(new Event(EVENT))
}

export function pendingCount() {
  return read().length
}

/** Pending field values for one row, so screens can show them before they're sent. */
export function pendingPatch(table: Table, id: string): Record<string, unknown> | undefined {
  const change = read().find((c) => c.table === table && c.id === id)
  return change && 'patch' in change ? change.patch : undefined
}

/** Rows created on this phone that haven't reached the database yet. */
export function pendingInserts(table: Table): Record<string, unknown>[] {
  return read().flatMap((c) => (c.table === table && 'patch' in c && c.insert ? [{ ...c.patch, id: c.id }] : []))
}

/** Calls `fn` whenever the queue changes. Returns an unsubscribe function. */
export function onPendingChange(fn: () => void) {
  window.addEventListener(EVENT, fn)
  return () => window.removeEventListener(EVENT, fn)
}

/**
 * Saves an edit and tries to send it right away. `insert` creates the row
 * (use a fresh crypto.randomUUID() id); later edits to it merge in.
 */
export function queueChange(table: Table, id: string, patch: Record<string, unknown>, { insert = false } = {}) {
  const list = read()
  const existing = list.find((c) => c.table === table && c.id === id)
  if (existing && 'patch' in existing) existing.patch = { ...existing.patch, ...patch }
  else list.push({ table, id, patch, insert, queuedAt: new Date().toISOString() })
  write(list)
  return flushSoon()
}

/** Saves a mileage leg (one per job) and tries to send it right away. */
export function queueMileage(leg: MileageLeg) {
  const list = read()
  if (!list.some((c) => c.table === 'mileage_entries' && c.id === leg.jobId)) {
    list.push({ table: 'mileage_entries', id: leg.jobId, leg, queuedAt: new Date().toISOString() })
    write(list)
  }
  return flushSoon()
}

// If a send is already running, go again after it so a new item isn't left waiting.
function flushSoon() {
  return flushing ? flushing.then(() => flushPending()) : flushPending()
}

const looksOffline = (message: string) => !navigator.onLine || /fetch|network|load failed/i.test(message)

/** Sends one item. Returns null when done, or the database's refusal message. */
async function send(change: PendingChange): Promise<string | null> {
  if (change.table === 'mileage_entries') {
    await sendLeg(change.leg) // throws on any failure
    return null
  }
  const { data, error } = change.insert
    ? await supabase.from(change.table).upsert({ ...change.patch, id: change.id }).select('id')
    : await supabase.from(change.table).update(change.patch).eq('id', change.id).select('id')
  if (error) throw new Error(error.message)
  return data?.length ? null : `You don't have permission to change this ${change.table === 'customers' ? 'customer' : 'job'}.`
}

export interface FlushResult {
  sent: number
  failed: { id: string; message: string }[]
}

/**
 * Sends everything waiting, oldest first. Stops at the first network
 * failure (no signal) and leaves the rest for next time. An edit the
 * database refuses (e.g. the job was reassigned to someone else) is
 * dropped and reported, so it can't block the queue forever.
 */
export function flushPending(): Promise<FlushResult> {
  if (flushing) return flushing
  flushing = (async () => {
    const result: FlushResult = { sent: 0, failed: [] }
    if (typeof navigator !== 'undefined' && !navigator.onLine) return result
    for (const change of read()) {
      let refused: string | null
      try {
        refused = await send(change)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (looksOffline(message)) break // no signal: keep it and everything after it
        refused = message
      }
      // Remove only if nothing newer was merged in while this was in flight.
      const sent = JSON.stringify(change)
      write(read().filter((c) => JSON.stringify(c) !== sent))
      if (refused) result.failed.push({ id: change.id, message: refused })
      else result.sent++
    }
    return result
  })().finally(() => {
    flushing = null
  })
  return flushing
}
