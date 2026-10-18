// =============================================================================
// GEOCODE — lib/app/geocode.ts
// =============================================================================
// WHAT THIS FILE DOES:
//   Address -> map coordinates (the web version of the iPhone app's
//   GeocodingService), for the customer form's Validate button and the
//   Schedule tab. These coordinates drive route order, drive times and the
//   mileage log, so getting the exact house matters.
//
//   1. US Census Bureau geocoder (via our /api/geocode, since it can't be
//      called from a browser): places the house number on its real spot
//      along the street. Best for residential addresses.
//   2. OpenStreetMap Nominatim, if Census has no match or can't be reached.
//      Nominatim sometimes only finds the street; that comes back as
//      precision 'street' so the screen can warn about it.
//
//   Only the address text is sent, and only for an explicit lookup.
// =============================================================================

import { supabase } from '@/lib/supabaseClient'

export type GeocodePrecision = 'address' | 'street' | 'area'

export interface GeocodeResult {
  latitude: number
  longitude: number
  displayName: string
  /** 'address' = the house itself; 'street'/'area' = only roughly placed. */
  precision: GeocodePrecision
  source: 'US Census' | 'OpenStreetMap'
}

async function census(address: string): Promise<GeocodeResult | null> {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return null
    const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    const { match } = await res.json()
    if (!match) return null
    return {
      latitude: Number(match.latitude),
      longitude: Number(match.longitude),
      displayName: match.matchedAddress,
      precision: 'address',
      source: 'US Census',
    }
  } catch {
    return null
  }
}

async function openStreetMap(address: string): Promise<GeocodeResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(address)}`
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const [hit] = await res.json()
    if (!hit) return null
    const kind = `${hit.addresstype ?? ''} ${hit.class ?? ''}`
    const precision: GeocodePrecision = /road|highway/.test(kind)
      ? 'street'
      : /building|house|place|amenity|shop|office|leisure|tourism/.test(kind)
        ? 'address'
        : 'area'
    return { latitude: Number(hit.lat), longitude: Number(hit.lon), displayName: hit.display_name ?? '', precision, source: 'OpenStreetMap' }
  } catch {
    return null
  }
}

/** The best match for `address`, or null if neither service found it (or no signal). */
export async function geocode(address: string): Promise<GeocodeResult | null> {
  const q = address.trim()
  if (!q) return null
  return (await census(q)) ?? (await openStreetMap(q))
}
