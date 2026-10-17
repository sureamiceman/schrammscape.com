// =============================================================================
// INVOICE LOGIN FORM — components/invoices/LoginForm.tsx
// =============================================================================
// WHAT THIS FILE DOES:
//   The email/password sign-in screen shown at schrammscape.com/invoices
//   when nobody is signed in yet. Same account as the iPhone app — there
//   is nothing new to set up here, Tim and Tyler use the exact same
//   email/password they already use in SchrammScape Calendar.
//
// DEPENDS ON:
//   - lib/supabaseClient.ts
//
// USED BY:
//   - components/invoices/InvoiceApp.tsx (rendered instead of the
//     dashboard whenever there's no active session).
// =============================================================================

'use client'

import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-lg border p-8 flex flex-col gap-4 shadow-sm"
      >
        <div className="text-center mb-2">
          <h1 className="text-xl font-semibold" style={{ color: 'var(--hunter)' }}>
            SchrammScape Invoices
          </h1>
          <p className="text-sm text-gray-500 mt-1">Sign in with your crew account</p>
        </div>

        <input
          type="email"
          required
          autoComplete="username"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md text-white font-medium py-2.5 disabled:opacity-60"
          style={{ backgroundColor: 'var(--hunter)' }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <p className="text-xs text-gray-400 text-center mt-2">
          Same email &amp; password as the SchrammScape iPhone app.
        </p>
      </form>
    </div>
  )
}
