// =============================================================================
// APP SHELL — components/app/AppShell.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   The frame of the SchrammScape crew app at schrammscape.com/app:
//     - sign-in gate (same Supabase accounts as the iPhone app)
//     - looks up the signed-in person's role (admin / manager / crew)
//     - top bar with name + sign out, "offline" notice
//     - sends edits saved while offline once signal is back
//       (lib/app/pendingChanges.ts)
//     - bottom tab bar: Today, Customers, Billing (Billing: admin/manager only)
//
//   Who sees what is enforced by the database's security rules, not by this
//   screen. Hiding the Billing tab from crew is just tidiness.
//
// DEPENDS ON:
//   - lib/supabaseClient.ts, lib/app/offlineCache.ts, lib/app/pendingChanges.ts
//   - components/invoices/LoginForm.tsx (shared with /invoices)
//   - components/app/TodayTab.tsx, CustomersTab.tsx, BillingTab.tsx
// =============================================================================

'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { clearCached } from '@/lib/app/offlineCache'
import { flushPending, onPendingChange, pendingCount } from '@/lib/app/pendingChanges'
import LoginForm from '@/components/invoices/LoginForm'
import TodayTab from './TodayTab'
import CustomersTab from './CustomersTab'
import BillingTab from './BillingTab'

export type Role = 'admin' | 'manager' | 'crew'
export interface Profile {
  user_id: string
  display_name: string
  role: Role
}

type TabId = 'today' | 'customers' | 'billing'
const TAB_KEY = 'ss-app:tab'

function useOnline() {
  const [online, setOnline] = useState(true)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

function usePendingCount() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const update = () => setCount(pendingCount())
    update()
    return onPendingChange(update)
  }, [])
  return count
}

export default function AppShell() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [tab, setTab] = useState<TabId>('today')
  const online = useOnline()
  const pending = usePendingCount()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    try {
      const saved = localStorage.getItem(TAB_KEY) as TabId | null
      if (saved) setTab(saved)
    } catch {
      /* ignore */
    }
    return () => listener.subscription.unsubscribe()
  }, [])

  // Send anything saved while offline: on sign-in/open, and whenever signal returns.
  useEffect(() => {
    if (session && online) flushPending()
  }, [session, online])

  useEffect(() => {
    if (!session) return
    supabase
      .from('profiles')
      .select('user_id, display_name, role')
      .then(({ data }) => {
        if (data) setProfiles(data as Profile[])
      })
  }, [session])

  const me = profiles.find((p) => p.user_id === session?.user.id)
  const isManager = me?.role === 'admin' || me?.role === 'manager'
  const tabs: { id: TabId; label: string; icon: JSX.Element }[] = [
    { id: 'today', label: 'Today', icon: <IconCalendar /> },
    { id: 'customers', label: 'Customers', icon: <IconPeople /> },
    ...(isManager ? [{ id: 'billing' as TabId, label: 'Billing', icon: <IconInvoice /> }] : []),
  ]
  const activeTab = tabs.some((t) => t.id === tab) ? tab : 'today'

  const chooseTab = (id: TabId) => {
    setTab(id)
    try {
      localStorage.setItem(TAB_KEY, id)
    } catch {
      /* ignore */
    }
  }

  const signOut = async () => {
    if (
      pending > 0 &&
      !window.confirm(`${pending} change${pending === 1 ? ' is' : 's are'} still waiting for signal and will be lost. Sign out anyway?`)
    ) {
      return
    }
    clearCached()
    await supabase.auth.signOut()
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    )
  }

  if (!session) {
    return <LoginForm title="SchrammScape" subtitle="Sign in to the crew app" />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header
        className="sticky top-0 z-20 text-white"
        style={{ backgroundColor: 'var(--hunter)', paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between px-4 h-14 max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <Image
              src="/app-icons/icon-192.png"
              alt=""
              width={32}
              height={32}
              className="rounded-md bg-white"
            />
            <span className="font-semibold">SchrammScape</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="opacity-90 truncate max-w-[9rem]">{me?.display_name || session.user.email}</span>
            <button onClick={signOut} className="underline opacity-90">
              Sign out
            </button>
          </div>
        </div>
        {!online ? (
          <div className="bg-amber-100 text-amber-900 text-xs text-center py-1">
            Offline: showing the last saved copy.
            {pending > 0 && ` ${pending} change${pending === 1 ? '' : 's'} will send when you have signal.`}
          </div>
        ) : (
          pending > 0 && (
            <div className="bg-amber-100 text-amber-900 text-xs text-center py-1">
              Sending {pending} saved change{pending === 1 ? '' : 's'}…
            </div>
          )
        )}
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pt-4 pb-28">
        {activeTab === 'today' && <TodayTab profiles={profiles} showAssignee={isManager} />}
        {activeTab === 'customers' && <CustomersTab showRates={isManager} />}
        {activeTab === 'billing' && isManager && <BillingTab />}
      </main>

      <nav
        className="fixed bottom-0 inset-x-0 z-20 bg-white border-t"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex max-w-3xl mx-auto">
          {tabs.map((t) => {
            const active = t.id === activeTab
            return (
              <button
                key={t.id}
                onClick={() => chooseTab(t.id)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs"
                style={{ color: active ? 'var(--hunter)' : '#6b7280', fontWeight: active ? 600 : 400 }}
                aria-current={active ? 'page' : undefined}
              >
                {t.icon}
                {t.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

// ------------------------------------------------------------------ icons
const iconProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}
function IconCalendar() {
  return (
    <svg {...iconProps} aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}
function IconPeople() {
  return (
    <svg {...iconProps} aria-hidden>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17 14.5c2.2 0 3.9 1.5 4.5 4" />
    </svg>
  )
}
function IconInvoice() {
  return (
    <svg {...iconProps} aria-hidden>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M14 3v5h5M9 12h7M9 16h7" />
    </svg>
  )
}
