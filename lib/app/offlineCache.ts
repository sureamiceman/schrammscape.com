// =============================================================================
// OFFLINE CACHE — lib/app/offlineCache.ts
// =============================================================================
// Keeps the last successfully loaded copy of each list (today's jobs,
// customers, invoices) on the phone, so the app can still show them when
// there's no signal. Read-only fallback: it never sends anything anywhere.
// Storage can be unavailable (private browsing etc.), so every call is
// wrapped and simply does nothing if it fails.
// =============================================================================

const PREFIX = 'ss-app:'

export function saveCached<T>(key: string, data: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: new Date().toISOString(), data }))
  } catch {
    /* storage full or blocked: ignore */
  }
}

export function loadCached<T>(key: string): { savedAt: string; data: T } | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearCached() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}
