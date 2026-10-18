// =============================================================================
// TEAM SCREEN — components/app/TeamScreen.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   Admin-only list of everyone's user profile, opened from "Team" in the
//   crew app's top bar. For each person: name, role, and the
//   "Allow user to send invoices?" switch (off by default). With it on,
//   that person gets Share and Email on invoices; admins always have them.
//
//   Saves straight to Supabase (needs signal). Only admins can change
//   profiles, enforced by the database, so nobody can turn this on for
//   themselves.
// =============================================================================

'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Profile } from './AppShell'

const ROLE_LABEL: Record<string, string> = { admin: 'Admin', manager: 'Manager', crew: 'Crew' }

export default function TeamScreen({
  profiles,
  onChanged,
  onClose,
}: {
  profiles: Profile[]
  onChanged: (updated: Profile) => void
  onClose: () => void
}) {
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const toggle = async (p: Profile) => {
    const next = !p.can_send_invoices
    setSaving(p.user_id)
    setError(null)
    const { data, error } = await supabase
      .from('profiles')
      .update({ can_send_invoices: next })
      .eq('user_id', p.user_id)
      .select('user_id')
    setSaving(null)
    if (error || !data?.length) {
      setError(error?.message ?? 'Only an admin can change this.')
      return
    }
    onChanged({ ...p, can_send_invoices: next })
  }

  const sorted = [...profiles].sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''))

  return (
    <div className="fixed inset-0 z-30 bg-gray-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Team">
      <div className="sticky top-0 z-10 bg-white border-b" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center justify-between h-14 px-4 max-w-3xl mx-auto">
          <span className="w-12" />
          <h1 className="font-semibold">Team</h1>
          <button onClick={onClose} className="w-12 text-right text-sm font-semibold" style={{ color: 'var(--hunter)' }}>
            Done
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col gap-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {sorted.map((p) => {
          const isAdmin = p.role === 'admin'
          const on = isAdmin || p.can_send_invoices
          return (
            <section key={p.user_id} className="bg-white rounded-lg border p-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-gray-900">{p.display_name || 'Unnamed'}</span>
                <span className="text-xs text-gray-500">{ROLE_LABEL[p.role] ?? p.role}</span>
              </div>
              <label className="flex items-center justify-between gap-3 mt-3">
                <span className="text-sm text-gray-700">
                  Allow user to send invoices?
                  {isAdmin && <span className="block text-xs text-gray-500">Admins can always send.</span>}
                  {p.role === 'crew' && !isAdmin && (
                    <span className="block text-xs text-gray-500">Crew can&apos;t open Billing, so this has no effect unless they become a manager.</span>
                  )}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  disabled={isAdmin || saving === p.user_id}
                  onClick={() => toggle(p)}
                  className="relative shrink-0 h-7 w-12 rounded-full transition-colors disabled:opacity-60"
                  style={{ backgroundColor: on ? 'var(--hunter)' : '#d1d5db' }}
                >
                  <span
                    className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all"
                    style={{ left: on ? '1.375rem' : '0.125rem' }}
                  />
                  <span className="sr-only">{on ? 'Yes' : 'No'}</span>
                </button>
              </label>
            </section>
          )
        })}
      </div>
    </div>
  )
}
