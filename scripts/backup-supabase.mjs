#!/usr/bin/env node
// =============================================================================
// SUPABASE BACKUP — scripts/backup-supabase.mjs
// =============================================================================
// WHAT THIS FILE DOES:
//   Makes a complete copy of every row in the SchrammScape Supabase database
//   (the one shared by the iPhone app, /invoices and the PWA) and saves it to
//   a dated folder on this Mac. Each table is saved twice:
//     - <table>.json  exact copy, used by restore-supabase.mjs
//     - <table>.csv   opens in Excel / Numbers for a quick look
//   plus manifest.json (row counts, time, who ran it) and a copy of the
//   database schema (the migration .sql files from the iPhone app project).
//
// HOW TO RUN (from the schrammscape.com folder, in the Mac's Terminal app):
//     node scripts/backup-supabase.mjs
//   Sign in with an ADMIN account (Tim). The password is typed hidden and is
//   never saved. Backups go to ~/DEV/SchrammScape-Backups/ unless you pass
//   a different folder:  node scripts/backup-supabase.mjs ~/Desktop/backup
//
// WHAT IT DOES NOT COPY:
//   Login passwords (Supabase never exposes them). The three logins can be
//   re-created in the dashboard; their names/roles ARE saved (profiles table).
//
// SAFETY:
//   Read-only. Uses the public anon key + your own login, so the database's
//   security rules apply. Backups contain customer names/addresses/phones:
//   they are written OUTSIDE the git projects so they never get committed.
// =============================================================================

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

export const TABLES = [
  'profiles',
  'customers',
  'service_items',
  'job_types',
  'work_records',
  'invoices',
  'mileage_entries',
]

const here = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(here, '..')

// ---------------------------------------------------------------- helpers
export function loadEnv(file) {
  const env = {}
  if (!fs.existsSync(file)) return env
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return env
}

export function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s)
        else if (s.includes('\n') || s.includes('\r')) rl.output.write('\n')
      }
    }
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

export function toCsv(rows) {
  if (!rows.length) return ''
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))]
  const cell = (v) => {
    if (v === null || v === undefined) return ''
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n') + '\n'
}

export function expandHome(p) {
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p
}

export async function signIn() {
  const env = { ...loadEnv(path.join(projectRoot, '.env.local')), ...process.env }
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
    process.exit(1)
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const email = (await ask('Admin email [tschramm2010@gmail.com]: ')) || 'tschramm2010@gmail.com'
  const password = await ask('Password (hidden): ', { hidden: true })
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    console.error(`Sign-in failed: ${error.message}`)
    process.exit(1)
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('user_id', data.user.id)
    .maybeSingle()
  if (profile?.role !== 'admin') {
    console.error(`"${email}" is not an admin account (role: ${profile?.role ?? 'none'}). ` +
      'Only an admin can see every row, so the backup would be incomplete.')
    process.exit(1)
  }
  return { supabase, email, url }
}

async function fetchAll(supabase, table) {
  const pageSize = 1000
  const orderCol = table === 'profiles' ? 'user_id' : 'id'
  const rows = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderCol, { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...data)
    if (data.length < pageSize) break
  }
  return rows
}

// ------------------------------------------------------------------- main
async function main() {
  const stamp = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+$/, '')
  const base = expandHome(process.argv[2] || '~/DEV/SchrammScape-Backups')
  const outDir = path.join(base, `supabase-${stamp}`)

  console.log('\nSchrammScape Supabase backup\n')
  const { supabase, email, url } = await signIn()

  fs.mkdirSync(outDir, { recursive: true })
  const manifest = {
    created_at: new Date().toISOString(),
    created_by: email,
    supabase_url: url,
    tables: {},
  }

  for (const table of TABLES) {
    process.stdout.write(`  ${table.padEnd(16)} `)
    const rows = await fetchAll(supabase, table)
    fs.writeFileSync(path.join(outDir, `${table}.json`), JSON.stringify(rows, null, 2))
    fs.writeFileSync(path.join(outDir, `${table}.csv`), toCsv(rows))
    const deleted = rows.filter((r) => r.deleted_at).length
    manifest.tables[table] = { rows: rows.length, soft_deleted: deleted }
    console.log(`${rows.length} rows${deleted ? ` (${deleted} soft-deleted)` : ''}`)
  }

  // Keep the schema next to the data so the backup is self-contained.
  const migrations = path.resolve(projectRoot, '..', 'SchrammScape Calendar', 'supabase', 'migrations')
  if (fs.existsSync(migrations)) {
    const dest = path.join(outDir, 'schema')
    fs.mkdirSync(dest, { recursive: true })
    for (const f of fs.readdirSync(migrations).filter((f) => f.endsWith('.sql'))) {
      fs.copyFileSync(path.join(migrations, f), path.join(dest, f))
    }
    manifest.schema_files = fs.readdirSync(dest)
  }

  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  await supabase.auth.signOut()

  console.log(`\nDone. Backup saved to:\n  ${outDir}\n`)
  console.log('Tip: copy that folder somewhere off this Mac too (iCloud Drive, Google Drive or a USB stick).\n')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`\nBackup FAILED: ${err.message}`)
    process.exit(1)
  })
}
