// =============================================================================
// SUPABASE CLIENT — lib/supabaseClient.ts
// =============================================================================
// WHAT THIS FILE DOES:
//   Creates one shared connection, for use in the browser, to the same
//   Supabase backend the SchrammScape Calendar iPhone app already uses.
//   The /invoices page uses this to sign Tim/Tyler in and to read the
//   `invoices` table.
//
// DEPENDS ON:
//   - The "@supabase/supabase-js" npm package.
//   - Two environment variables: NEXT_PUBLIC_SUPABASE_URL and
//     NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.local.example). Both are
//     safe to expose publicly — the iPhone app ships the same key inside
//     its binary. Supabase's Row Level Security rules (not this key) are
//     what actually decide who can read/write what.
//
// USED BY:
//   - components/invoices/InvoiceApp.tsx and its children (LoginForm,
//     InvoiceList, InvoiceForm).
// =============================================================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly rather than silently rendering a broken page — makes a
  // missing .env.local a lot faster to diagnose.
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — see .env.local.example'
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
