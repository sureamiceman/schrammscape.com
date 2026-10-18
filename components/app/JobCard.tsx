// =============================================================================
// JOB CARD — components/app/JobCard.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   One job on the Today tab, with the same actions as the iPhone app's
//   My Day:
//     - Check In          scheduled   -> in progress (records the start time)
//     - Complete          in progress -> done (records the end time)
//     - Add job to visit  extra billable work done on the spot
//     - Extra-work note   free-form comment shown on the invoice
//   plus Undo on a finished job (until it has been invoiced), for mis-taps.
//
//   BILLING: each job is either "Invoice" (billed per visit) or
//   "Subscription" (covered by the customer's monthly plan). It starts from
//   the customer's plan and can be switched here until the job is invoiced.
//   A finished subscription job gets "Text completion notice": a prefilled
//   text to the customer saying what was done and when (no prices; same
//   wording as the iPhone app's work summary). A finished invoice job shows
//   "Needs invoice" until it's billed.
//
//   This card never talks to Supabase itself: it hands each edit to
//   `onChange`, and TodayTab saves it through lib/app/pendingChanges.ts.
// =============================================================================

'use client'

import { useState } from 'react'
import { mapsUrl, type WorkRecordRow } from './TodayTab'

const STATUS: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-gray-100 text-gray-700' },
  inProgress: { label: 'In progress', className: 'bg-amber-100 text-amber-800' },
  completed: { label: 'Done', className: 'bg-green-100 text-green-800' },
  skipped: { label: 'Skipped', className: 'bg-gray-100 text-gray-500 line-through' },
}

const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

const noticeDayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const clock24 = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** The "work completed" text (port of the iPhone app's WorkSummaryBuilder.singleVisit). */
export function completionNotice(job: WorkRecordRow) {
  let text = `SchrammScape Lawncare: Completed ${job.job_title || 'your service'} — ${noticeDayFmt.format(new Date(job.scheduled_start))}`
  if (job.actual_start && job.actual_end) text += `, ${clock24(job.actual_start)}–${clock24(job.actual_end)}`
  const took = durationLabel(job.actual_start, job.actual_end)
  if (took) text += ` (${took})`
  text += '.'
  for (const extra of job.extra_services) text += `\nAdded on site: ${extra}.`
  if (job.extra_notes) text += `\nExtra work: ${job.extra_notes}.`
  return text + '\nThank you!'
}

function durationLabel(start: string | null, end: string | null) {
  if (!start || !end) return null
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
  if (minutes <= 0) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`
}

type Panel = 'none' | 'addJob' | 'comment'

export default function JobCard({
  job,
  who,
  extraJobNames,
  pending,
  onChange,
}: {
  job: WorkRecordRow
  who?: string
  extraJobNames: string[]
  pending: boolean
  onChange: (patch: Partial<WorkRecordRow>) => void
}) {
  const [panel, setPanel] = useState<Panel>('none')
  const [customJob, setCustomJob] = useState('')
  const [comment, setComment] = useState(job.extra_notes)
  const s = STATUS[job.status] ?? STATUS.scheduled
  const billing = job.billing ?? 'invoice'
  const phoneDigits = job.phone.replace(/[^\d+]/g, '')
  const open = job.status === 'scheduled' || job.status === 'inProgress'

  const togglePanel = (p: Panel) => {
    setComment(job.extra_notes)
    setPanel(panel === p ? 'none' : p)
  }

  const checkIn = () => onChange({ status: 'inProgress', actual_start: new Date().toISOString() })

  const complete = () =>
    onChange({
      status: 'completed',
      // Completed without a check-in: assume the scheduled start (same as the iPhone app).
      actual_start: job.actual_start ?? job.scheduled_start,
      actual_end: new Date().toISOString(),
    })

  const undo = () => {
    if (window.confirm(`Mark ${job.customer_name || 'this job'} as not finished?`)) {
      onChange({ status: 'inProgress', actual_end: null })
    }
  }

  const addExtra = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || job.extra_services.includes(trimmed)) return
    onChange({ extra_services: [...job.extra_services, trimmed] })
    setCustomJob('')
  }

  const removeExtra = (name: string) => onChange({ extra_services: job.extra_services.filter((n) => n !== name) })

  const saveComment = () => {
    if (comment.trim() !== job.extra_notes) onChange({ extra_notes: comment.trim() })
    setPanel('none')
  }

  const linkButton = 'flex-1 text-center text-sm rounded-md border py-2'

  return (
    <li className="bg-white rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-gray-500">
            {timeFmt.format(new Date(job.scheduled_start))} – {timeFmt.format(new Date(job.scheduled_end))}
            {who && ` · ${who}`}
          </div>
          <div className="font-semibold text-gray-900 truncate">{job.customer_name || 'Untitled job'}</div>
          {job.job_title && <div className="text-sm text-gray-600">{job.job_title}</div>}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className={`text-xs px-2 py-0.5 rounded-full ${s.className}`}>{s.label}</span>
          {pending && <span className="text-[11px] text-amber-700">Waiting for signal</span>}
        </div>
      </div>

      {job.notes && <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{job.notes}</p>}
      {job.extra_services.length > 0 && (
        <p className="text-sm mt-2" style={{ color: 'var(--hunter)' }}>
          {job.extra_services.map((n) => `+ ${n}`).join('   ')}
        </p>
      )}
      {job.extra_notes && <p className="text-sm text-gray-700 mt-1 italic">“{job.extra_notes}”</p>}

      <div className="flex gap-2 mt-3">
        {job.address && (
          <a href={mapsUrl(job.address)} className={linkButton} style={{ color: 'var(--hunter)' }}>
            Directions
          </a>
        )}
        {job.phone && (
          <a href={`tel:${job.phone.replace(/[^\d+]/g, '')}`} className={linkButton} style={{ color: 'var(--hunter)' }}>
            Call
          </a>
        )}
      </div>

      {open && (
        <div className="flex gap-2 mt-2">
          <button onClick={() => togglePanel('addJob')} className={`${linkButton} text-gray-700`} aria-expanded={panel === 'addJob'}>
            + Add job
          </button>
          <button onClick={() => togglePanel('comment')} className={`${linkButton} text-gray-700`} aria-expanded={panel === 'comment'}>
            {job.extra_notes ? 'Edit note' : 'Extra-work note'}
          </button>
        </div>
      )}

      {open && panel === 'addJob' && (
        <div className="mt-3 rounded-md bg-gray-50 p-3">
          <p className="text-xs text-gray-500 mb-2">Add a job to this visit (billed as an extra line)</p>
          <div className="flex flex-wrap gap-2">
            {extraJobNames
              .filter((n) => !job.extra_services.includes(n))
              .map((n) => (
                <button key={n} onClick={() => addExtra(n)} className="text-sm rounded-full border bg-white px-3 py-1">
                  + {n}
                </button>
              ))}
          </div>
          <form
            className="flex gap-2 mt-2"
            onSubmit={(e) => {
              e.preventDefault()
              addExtra(customJob)
            }}
          >
            <input
              value={customJob}
              onChange={(e) => setCustomJob(e.target.value)}
              placeholder="Describe the job"
              className="flex-1 min-w-0 rounded-md border px-2 py-1.5 text-sm"
            />
            <button type="submit" disabled={!customJob.trim()} className="text-sm rounded-md border bg-white px-3 disabled:opacity-40">
              Add
            </button>
          </form>
          {job.extra_services.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1">
              {job.extra_services.map((n) => (
                <li key={n} className="flex items-center justify-between text-sm">
                  <span>{n}</span>
                  <button onClick={() => removeExtra(n)} className="text-xs text-red-600 underline">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {open && panel === 'comment' && (
        <div className="mt-3 rounded-md bg-gray-50 p-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="e.g. Raked and cleaned up heavy clippings"
            className="w-full rounded-md border px-2 py-1.5 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Appears on the work summary / invoice for this visit.</p>
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setPanel('none')} className="text-sm px-3 py-1.5 text-gray-600">
              Cancel
            </button>
            <button onClick={saveComment} className="text-sm rounded-md px-3 py-1.5 text-white" style={{ backgroundColor: 'var(--hunter)' }}>
              Save note
            </button>
          </div>
        </div>
      )}

      {job.status === 'scheduled' && (
        <button onClick={checkIn} className="w-full mt-3 rounded-md py-2.5 font-semibold text-white" style={{ backgroundColor: 'var(--hunter)' }}>
          Check In
        </button>
      )}
      {job.status === 'inProgress' && (
        <>
          {job.actual_start && (
            <p className="text-xs text-gray-500 mt-3">Checked in at {timeFmt.format(new Date(job.actual_start))}</p>
          )}
          <button onClick={complete} className="w-full mt-1 rounded-md py-2.5 font-semibold text-white bg-green-600">
            Complete
          </button>
        </>
      )}
      {!job.invoice_number && (
        <div className="flex items-center gap-2 mt-3 text-xs">
          <span className="text-gray-500">Billing:</span>
          {(['invoice', 'subscription'] as const).map((b) => (
            <button
              key={b}
              onClick={() => b !== billing && onChange({ billing: b })}
              aria-pressed={b === billing}
              className="rounded-full border px-3 py-1"
              style={
                b === billing
                  ? { backgroundColor: 'var(--hunter)', borderColor: 'var(--hunter)', color: 'white' }
                  : { color: '#4b5563' }
              }
            >
              {b === 'invoice' ? 'Invoice' : 'Subscription'}
            </button>
          ))}
        </div>
      )}

      {job.status === 'completed' && billing === 'subscription' && (
        <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm">
          {job.notice_sent_at && (
            <p className="text-xs text-green-700 mb-2">
              ✓ Completion notice opened in Messages {new Date(job.notice_sent_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
          {phoneDigits ? (
            <a
              href={`sms:${phoneDigits}?&body=${encodeURIComponent(completionNotice(job))}`}
              onClick={() => onChange({ notice_sent_at: new Date().toISOString() })}
              className="block text-center rounded-md py-2 font-medium text-white"
              style={{ backgroundColor: 'var(--hunter)' }}
            >
              {job.notice_sent_at ? 'Text completion notice again' : 'Text completion notice'}
            </a>
          ) : (
            <p className="text-xs text-amber-700">No phone number on this job, so no notice can be texted.</p>
          )}
        </div>
      )}

      {job.status === 'completed' && (
        <div className="flex items-center justify-between mt-3 text-sm">
          <span className="text-green-700 font-medium">
            ✓ Completed{durationLabel(job.actual_start, job.actual_end) && ` — ${durationLabel(job.actual_start, job.actual_end)}`}
          </span>
          {job.invoice_number ? (
            <span className="text-xs text-gray-500">Invoiced #{job.invoice_number}</span>
          ) : (
            <span className="flex items-center gap-3">
              {billing === 'invoice' && <span className="text-xs font-medium text-amber-700">Needs invoice</span>}
              <button onClick={undo} className="text-xs text-gray-500 underline">
                Undo
              </button>
            </span>
          )}
        </div>
      )}
    </li>
  )
}
