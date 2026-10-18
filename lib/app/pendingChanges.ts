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
//   whole-row upsert). The iPhone app's own sync then pulls the new values,
//   because the database bumps updated_at on every write.
//
//   Several edits to the same job while offline are merged into one, with
//   the newest value of each field winning.
//
// STORAGE:
//   localStorage, wrapped in try/catch like offlineCache.ts. If storage is
//   blocked the edit is still sent straight away; it just can't wait for
//   signal.
// =============================================================================

import { supabase } from '@/lib/supabaseClient'

export type Table = 'work_records'

interface PendingChange {
  table: Table
  id: string
  patch: Record<string, unknown>
  queuedAt: string
}

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
  return read().find((c) => c.table === table && c.id === id)?.patch
}

/** Calls `fn` whenever the queue changes. Returns an unsubscribe function. */
export function onPendingChange(fn: () => void) {
  window.addEventListener(EVENT, fn)
  return () => window.removeEventListener(EVENT, fn)
}

/** Saves an edit and tries to send it right away. */
export function queueChange(table: Table, id: string, patch: Record<string, unknown>) {
  const list = read()
  const existing = list.find((c) => c.table === table && c.id === id)
  if (existing) existing.patch = { ...existing.patch, ...patch }
  else list.push({ table, id, patch, queuedAt: new Date().toISOString() })
  write(list)
  // If a send is already running, go again after it so this edit isn't left waiting.
  return flushing ? flushing.then(() => flushPending()) : flushPending()
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
      const { data, error } = await supabase
        .from(change.table)
        .update(change.patch)
        .eq('id', change.id)
        .select('id')
      const offline = error && (!navigator.onLine || /fetch|network/i.test(error.message))
      if (offline) break
      // Remove only if nothing newer was merged in while this was in flight.
      const sentPatch = JSON.stringify(change.patch)
      write(read().filter((c) => !(c.table === change.table && c.id === change.id && JSON.stringify(c.patch) === sentPatch)))
      if (error) result.failed.push({ id: change.id, message: error.message })
      else if (!data?.length) result.failed.push({ id: change.id, message: 'You no longer have access to this job.' })
      else result.sent++
    }
    return result
  })().finally(() => {
    flushing = null
  })
  return flushing
}
