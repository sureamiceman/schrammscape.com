// =============================================================================
// GEOCODE ENDPOINT — app/api/geocode/route.ts
// =============================================================================
// WHAT THIS FILE DOES:
//   Looks up an address with the US Census Bureau geocoder for the crew app
//   (lib/app/geocode.ts). The Census service places a house number on its
//   real spot along the street, which is more exact for homes than
//   OpenStreetMap; but it can't be called straight from a browser, so the
//   app asks this endpoint instead.
//
//   GET /api/geocode?address=...   (Authorization: Bearer <access token>)
//   -> { match: { latitude, longitude, matchedAddress } | null }
//
// SECURITY NOTE:
//   Only signed-in crew-app users can use it (the token is checked against
//   Supabase Auth), so it isn't an open lookup service for anyone on the web.
//   Only the address text is sent to the Census Bureau.
// =============================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: Request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const { data, error } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.getUser(token)
  if (error || !data.user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const address = (new URL(request.url).searchParams.get('address') || '').trim()
  if (!address || address.length > 300) return NextResponse.json({ error: 'Missing address.' }, { status: 400 })

  try {
    const url = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress')
    url.searchParams.set('address', address)
    url.searchParams.set('benchmark', 'Public_AR_Current')
    url.searchParams.set('format', 'json')
    const res = await fetch(url, { signal: AbortSignal.timeout(10000), cache: 'no-store' })
    const body = await res.json()
    const hit = body?.result?.addressMatches?.[0]
    return NextResponse.json({
      match: hit
        ? { latitude: hit.coordinates.y, longitude: hit.coordinates.x, matchedAddress: hit.matchedAddress }
        : null,
    })
  } catch {
    return NextResponse.json({ error: 'Census geocoder unreachable.' }, { status: 502 })
  }
}
