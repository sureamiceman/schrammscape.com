#!/usr/bin/env node
// =============================================================================
// SUPABASE RESTORE — scripts/restore-supabase.mjs
// =============================================================================
// WHAT THIS FILE DOES:
//   Puts a backup made by backup-supabase.mjs back into the database. Every
//   row in the backup is written back ("upserted") by its id:
//     - rows that still exist are overwritten with the backed-up version
//     - rows that were deleted are re-created
//     - rows added AFTER the backup are left alone (nothing is wiped)
//
// HOW TO RUN (from the schrammscape.com folder, in the Mac's Terminal app):
//     node scripts/restore-supabase.mjs ~/DEV/SchrammScape-Backups/supabase-<date>
//   Optionally restore only some tables:
//     node scripts/restore-supabase.mjs <folder> customers invoices
//   You'll sign in as an admin and must type RESTORE to confirm.
//
// NOTES:
//   - Restoring into a brand-new Supabase project: first run the schema .sql
//     files (saved in the backup's schema/ folder) in the SQL Editor, and
//     re-create the logins (Authentication -> Users) BEFORE restoring, or the
//     profiles rows will be rejected.
//   - The database stamps updated_at with "now" on every write, so restored
//     rows get a fresh updated_at. That's what makes the iPhone app pull the
//     restored versions on its next sync.
// =============================================================================

import fs from 'node:fs'
import path from 'node:path'
import { TABLES, ask, expandHome, signIn } from './backup-supabase.mjs'

async function main() {
  const dir = process.argv[2] && path.resolve(expandHome(process.argv[2]))
  if (!dir || !fs.existsSync(path.join(dir, 'manifest.json'))) {
    console.error('Usage: node scripts/restore-supabase.mjs <backup folder> [table ...]')
    console.error('The folder must contain manifest.json (made by backup-supabase.mjs).')
    process.exit(1)
  }
  const only = process.argv.slice(3)
  const tables = TABLES.filter((t) => (only.length ? only.includes(t) : true))
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'))

  console.log(`\nRestore from backup taken ${manifest.created_at}`)
  for (const t of tables) console.log(`  ${t.padEnd(16)} ${manifest.tables[t]?.rows ?? 0} rows`)
  console.log('')

  const { supabase } = await signIn()
  const confirm = await ask('Type RESTORE to write these rows back into the live database: ')
  if (confirm !== 'RESTORE') {
    console.log('Cancelled. Nothing was changed.')
    process.exit(0)
  }

  for (const table of tables) {
    const file = path.join(dir, `${table}.json`)
    if (!fs.existsSync(file)) continue
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'))
    const key = table === 'profiles' ? 'user_id' : 'id'
    process.stdout.write(`  ${table.padEnd(16)} `)
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from(table).upsert(rows.slice(i, i + 500), { onConflict: key })
      if (error) throw new Error(`${table}: ${error.message}`)
    }
    console.log(`${rows.length} rows restored`)
  }
  await supabase.auth.signOut()
  console.log('\nRestore complete.\n')
}

main().catch((err) => {
  console.error(`\nRestore FAILED: ${err.message}`)
  process.exit(1)
})
