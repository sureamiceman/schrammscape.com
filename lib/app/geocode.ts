// =============================================================================
// GEOCODE — lib/app/geocode.ts
// =============================================================================
// WHAT THIS FILE DOES:
//   Address -> map coordinates, for the "Validate" button on the customer
//   form (the web version of the iPhone app's GeocodingService). Validated
//   coordinates are what the mileage log and route planning rely on.
//
//   Uses the free OpenStreetMap Nominatim service, limited to US addresses.
//   Only the address text is sent, and only when someone taps Validate
//   (Nominatim's usage policy allows light, user-initiated lookups).
// =============================================================================

export interface GeocodeResult {
  latitude: number
  longitude: number
  displayName: string
}

/** The best match for `address`, or null if no match was found or the service is unreachable. */
export async function geocode(address: string): Promise<GeocodeResult | null> {
  const q = address.trim()
  if (!q) return null
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const [hit] = await res.json()
    if (!hit) return null
    return { latitude: Number(hit.lat), longitude: Number(hit.lon), displayName: hit.display_name ?? '' }
  } catch {
    return null
  }
}
