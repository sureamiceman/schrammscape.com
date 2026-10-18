// =============================================================================
// CUSTOMER FORM — components/app/CustomerForm.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   Full-screen add / edit form for one customer, the web version of the
//   iPhone app's CustomerEditView: Customer, Job, Schedule, Contact and
//   Details sections, plus address validation and Delete.
//
//   Changing the address clears its validated coordinates (same as the
//   iPhone app) until Validate is tapped again.
//
//   The form never talks to Supabase. On Save it hands back only the fields
//   that changed; CustomersTab sends them through lib/app/pendingChanges.ts.
//
//   Not here yet: the per-customer add-on services (service_items).
// =============================================================================

'use client'

import { useState } from 'react'
import { geocode, type GeocodeResult } from '@/lib/app/geocode'
import type { CustomerRow } from './CustomersTab'

const DAY_OPTIONS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const FREQUENCIES = [
  { weeks: 1, label: 'Weekly' },
  { weeks: 2, label: 'Bi-Weekly' },
  { weeks: 3, label: 'Every 3 Weeks' },
  { weeks: 4, label: 'Monthly' },
]

export type CustomerPatch = Partial<Omit<CustomerRow, 'id'>>

export const BLANK_CUSTOMER: Omit<CustomerRow, 'id' | 'sort_order'> = {
  name: '',
  address: '',
  job_title: '',
  duration_label: '',
  day_of_week: '',
  mower: '',
  details: '',
  phone: '',
  email: '',
  height: '',
  default_rate: 0,
  visit_interval_weeks: 1,
  latitude: null,
  longitude: null,
  geocode_status: '',
}

export default function CustomerForm({
  customer,
  showRates,
  onSave,
  onDelete,
  onClose,
}: {
  customer: Omit<CustomerRow, 'id' | 'sort_order'> & { id?: string }
  showRates: boolean
  onSave: (changes: CustomerPatch) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const isNew = !customer.id
  const [draft, setDraft] = useState(customer)
  const [rateText, setRateText] = useState(customer.default_rate ? String(customer.default_rate) : '')
  const [validating, setValidating] = useState(false)
  const [match, setMatch] = useState<GeocodeResult | null>(null)

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const setAddress = (address: string) => {
    setMatch(null)
    setDraft((d) => ({ ...d, address, latitude: null, longitude: null, geocode_status: '' }))
  }

  const validate = async () => {
    setValidating(true)
    const hit = await geocode(draft.address)
    setValidating(false)
    if (hit) {
      setMatch(hit)
      setDraft((d) => ({ ...d, latitude: hit.latitude, longitude: hit.longitude, geocode_status: 'valid' }))
    } else {
      setMatch(null)
      setDraft((d) => ({ ...d, latitude: null, longitude: null, geocode_status: 'failed' }))
    }
  }

  const save = () => {
    const rate = Number(rateText.replace(/[$,\s]/g, ''))
    const final = { ...draft, default_rate: Number.isFinite(rate) && rate > 0 ? Math.round(rate * 100) / 100 : 0 }
    const changes: CustomerPatch = {}
    for (const key of Object.keys(BLANK_CUSTOMER) as (keyof typeof BLANK_CUSTOMER)[]) {
      const value = typeof final[key] === 'string' ? (final[key] as string).trim() : final[key]
      if (isNew || value !== customer[key]) (changes as Record<string, unknown>)[key] = value
    }
    onSave(changes)
  }

  const remove = () => {
    if (onDelete && window.confirm(`Delete ${customer.name || 'this customer'}? Past jobs and invoices are kept.`)) onDelete()
  }

  const dayOptions = draft.day_of_week && !DAY_OPTIONS.includes(draft.day_of_week) ? [draft.day_of_week, ...DAY_OPTIONS] : DAY_OPTIONS
  const input = 'w-full rounded-md border px-3 py-2 text-base bg-white'

  return (
    <div className="fixed inset-0 z-30 bg-gray-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label={isNew ? 'New customer' : 'Edit customer'}>
      <div
        className="sticky top-0 z-10 bg-white border-b"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between h-14 px-4 max-w-3xl mx-auto">
          <button onClick={onClose} className="text-sm text-gray-600">
            Cancel
          </button>
          <h1 className="font-semibold">{isNew ? 'New Customer' : 'Edit Customer'}</h1>
          <button onClick={save} disabled={!draft.name.trim() && !draft.address.trim()} className="text-sm font-semibold disabled:opacity-40" style={{ color: 'var(--hunter)' }}>
            Save
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col gap-5" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
        <Section title="Customer">
          <Field label="Name">
            <input className={input} value={draft.name} onChange={(e) => set('name', e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Address">
            <input className={input} value={draft.address} onChange={(e) => setAddress(e.target.value)} autoComplete="off" />
          </Field>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span
              className={
                draft.geocode_status === 'valid' ? 'text-green-700' : draft.geocode_status === 'failed' ? 'text-amber-700' : 'text-gray-500'
              }
            >
              {draft.geocode_status === 'valid'
                ? '✓ Address validated'
                : draft.geocode_status === 'failed'
                  ? "⚠ Maps couldn't find this address"
                  : 'Not validated yet'}
            </span>
            <button onClick={validate} disabled={!draft.address.trim() || validating} className="rounded-md border bg-white px-3 py-1 disabled:opacity-40">
              {validating ? 'Checking…' : 'Validate'}
            </button>
          </div>
          {match && (
            <p className={`text-xs ${match.precision === 'address' ? 'text-gray-500' : 'text-amber-700'}`}>
              {match.precision === 'address'
                ? `Found (${match.source}): ${match.displayName}`
                : `Only the ${match.precision === 'street' ? 'street' : 'general area'} was found (${match.source}): ${match.displayName}. Check the house number and ZIP, then validate again; routes and mileage use this spot.`}
            </p>
          )}
        </Section>

        <Section title="Job">
          <Field label="Job title">
            <input className={input} value={draft.job_title} onChange={(e) => set('job_title', e.target.value)} />
          </Field>
          <Field label="Duration (minutes or TBD)">
            <input className={input} value={draft.duration_label} onChange={(e) => set('duration_label', e.target.value)} inputMode="text" />
          </Field>
          {showRates && (
            <Field label="Rate per visit ($)">
              <input className={input} value={rateText} onChange={(e) => setRateText(e.target.value)} inputMode="decimal" placeholder="0.00" />
            </Field>
          )}
        </Section>

        <Section title="Schedule">
          <Field label="Day of week">
            <select className={input} value={draft.day_of_week} onChange={(e) => set('day_of_week', e.target.value)}>
              <option value="">Unassigned</option>
              {dayOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Visit frequency">
            <select className={input} value={draft.visit_interval_weeks} onChange={(e) => set('visit_interval_weeks', Number(e.target.value))}>
              {FREQUENCIES.map((f) => (
                <option key={f.weeks} value={f.weeks}>
                  {f.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mower (e.g. 42, PUSH)">
              <input className={input} value={draft.mower} onChange={(e) => set('mower', e.target.value)} />
            </Field>
            <Field label="Cutting height">
              <input className={input} value={draft.height} onChange={(e) => set('height', e.target.value)} inputMode="decimal" />
            </Field>
          </div>
        </Section>

        <Section title="Contact">
          <Field label="Phone">
            <input className={input} value={draft.phone} onChange={(e) => set('phone', e.target.value)} type="tel" inputMode="tel" />
          </Field>
          <Field label="Email">
            <input
              className={input}
              value={draft.email}
              onChange={(e) => set('email', e.target.value)}
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </Field>
        </Section>

        <Section title="Details">
          <Field label="Job notes">
            <textarea className={input} rows={4} value={draft.details} onChange={(e) => set('details', e.target.value)} />
          </Field>
        </Section>

        {onDelete && (
          <button onClick={remove} className="w-full rounded-md border border-red-200 bg-white py-2.5 text-red-600">
            Delete Customer
          </button>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{title}</h2>
      <div className="bg-white rounded-lg border p-3 flex flex-col gap-3">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  )
}
