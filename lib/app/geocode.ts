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
//   Many customer addresses are saved without a state or ZIP ("12 Elm St
//   Troy"). There's a Troy in several states, so those get ", OH" added
//   (the business is in Troy, Ohio) before looking them up.
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

/** Adds the home state when an address has neither a state nor a ZIP code. */
export function withHomeState(address: string) {
  const a = address.trim().replace(/[,\s]+$/, '')
  const hasZip = /\b\d{5}(-\d{4})?\b/.test(a)
  // A state counts after a comma ("Troy, MI"), or Ohio on its own ("Troy OH"),
  // so street endings like "Ct" or "Ln" aren't mistaken for states.
  const hasState =
    /,\s*(A[KLRZ]|C[AOT]|D[CE]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY])\.?$/i.test(a) ||
    /\b(OH|Ohio)\.?$/i.test(a)
  return hasZip || hasState ? a : `${a}, OH`
}

/** The best match for `address`, or null if neither service found it (or no signal). */
export async function geocode(address: string): Promise<GeocodeResult | null> {
  const q = withHomeState(address)
  if (!address.trim()) return null
  return (await census(q)) ?? (await openStreetMap(q))
}
