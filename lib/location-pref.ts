// ---------------------------------------------------------------------------
// lib/location-pref.ts
//
// A user's "preferred location" preference is saved from the dashboard
// as a human display NAME ("Victoria Island" / "Ikoyi"), while the
// booking + consultation flows identify clinics by their short id /
// slug ("vi" / "ikoyi"). That mismatch silently broke the
// "auto-select my clinic" behaviour everywhere — the preference never
// matched any location so the flows always fell back to asking again.
//
// This tiny resolver bridges the two: given whatever value we stored
// (a name, a slug/id, or empty) and the live list of locations, it
// returns the matching location id, or null when nothing matches. It
// is intentionally forgiving (case- and whitespace-insensitive, matches
// on either id or name) so it keeps working no matter which format a
// given user's preference happens to be saved in.
// ---------------------------------------------------------------------------

export interface MinimalLocation {
  id: string
  name: string
}

/**
 * Resolve a stored `preferred_location` value to a concrete location id
 * present in `locations`. Matches by id first, then by display name,
 * both case/whitespace-insensitive. Returns `null` when the preference
 * is empty or no location matches (e.g. the clinic was removed).
 */
export function resolvePreferredLocationId(
  pref: string | null | undefined,
  locations: ReadonlyArray<MinimalLocation>,
): string | null {
  if (!pref) return null
  const needle = pref.trim().toLowerCase()
  if (!needle) return null

  const byId = locations.find((l) => l.id.trim().toLowerCase() === needle)
  if (byId) return byId.id

  const byName = locations.find((l) => l.name.trim().toLowerCase() === needle)
  if (byName) return byName.id

  return null
}

/**
 * Resolve a stored preference to its human display name. Falls back to
 * the raw preference string when we can't match a location (so the AI
 * still gets *something* useful rather than nothing).
 */
export function resolvePreferredLocationName(
  pref: string | null | undefined,
  locations: ReadonlyArray<MinimalLocation>,
): string | null {
  if (!pref) return null
  const id = resolvePreferredLocationId(pref, locations)
  if (id) {
    const match = locations.find((l) => l.id === id)
    if (match) return match.name
  }
  const trimmed = pref.trim()
  return trimmed.length > 0 ? trimmed : null
}
