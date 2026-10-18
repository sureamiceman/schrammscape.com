// =============================================================================
// SUPABASE KEEP-ALIVE — netlify/functions/supabase-keep-alive.mjs
// =============================================================================
// WHAT THIS FILE DOES:
//   Supabase pauses free projects after about a week with no activity (say,
//   over the winter when nobody opens the crew app). Netlify runs this once a
//   day: it makes one tiny read from the database, which counts as activity
//   and keeps the project awake.
//
//   It uses the same public URL and anon key as the website. The read goes
//   through Row Level Security like any visitor's, so it returns nothing,
//   but the database still does the work. Nothing is written or changed.
//
// WHY NETLIFY AND NOT GITHUB ACTIONS:
//   The GitHub repo is public, and GitHub turns off scheduled workflows in
//   public repos after 60 days without commits, exactly the quiet
//   season this is for. Netlify keeps running it as long as the site is live.
//
// CHECKING IT: Netlify dashboard -> Logs -> Functions -> supabase-keep-alive
//   (each run logs "Supabase keep-alive: HTTP 200"). You can also trigger
//   it by hand there with "Run now".
// =============================================================================

export default async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('Supabase keep-alive: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set in Netlify')
    return new Response('missing config', { status: 500 })
  }
  try {
    const res = await fetch(`${url}/rest/v1/job_types?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
    })
    console.log(`Supabase keep-alive: HTTP ${res.status}`)
    return new Response(`ok ${res.status}`)
  } catch (err) {
    console.error('Supabase keep-alive failed:', err)
    return new Response('failed', { status: 502 })
  }
}

// Every day at 09:00 UTC (early morning in Ohio).
export const config = { schedule: '0 9 * * *' }
