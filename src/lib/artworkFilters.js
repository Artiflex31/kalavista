// Pure helpers for the gallery filters. No React in here, so they are easy to
// test and reuse.

export const AVAILABILITY_ORDER = [
  'AVAILABLE',
  'RESERVED',
  'SOLD',
  'NOT_FOR_SALE',
]

export const AVAILABILITY_LABELS = {
  AVAILABLE: 'Available',
  RESERVED: 'Reserved',
  SOLD: 'Sold',
  NOT_FOR_SALE: 'Not for sale',
}

// API artworks use the enum values above. The local fallback data uses plain
// sentences such as "Available for enquiry", so both are mapped to one key.
// Returns null when the value is not recognised.
export function getAvailabilityKey(artwork) {
  const raw = String(artwork?.availability ?? '').trim()

  if (AVAILABILITY_ORDER.includes(raw)) {
    return raw
  }

  const text = raw.toLowerCase().replaceAll('_', ' ')

  if (text.includes('not for sale') || text.includes('unavailable')) {
    return 'NOT_FOR_SALE'
  }

  if (text.includes('sold')) {
    return 'SOLD'
  }

  if (text.includes('reserved')) {
    return 'RESERVED'
  }

  if (text.includes('available')) {
    return 'AVAILABLE'
  }

  return null
}

export function getMediumKey(artwork) {
  return String(artwork?.medium ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export function matchesAvailability(artwork, availability) {
  return availability === 'all' || getAvailabilityKey(artwork) === availability
}

export function matchesMedium(artwork, mediumKey) {
  return mediumKey === 'all' || getMediumKey(artwork) === mediumKey
}

// Only options that exist in the catalogue are returned, each with a count.
export function buildAvailabilityOptions(artworks) {
  const counts = new Map()

  for (const artwork of artworks) {
    const key = getAvailabilityKey(artwork)

    if (key) {
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  return AVAILABILITY_ORDER.filter((key) => counts.has(key)).map((key) => ({
    value: key,
    label: AVAILABILITY_LABELS[key],
    count: counts.get(key),
  }))
}

export function buildMediumOptions(artworks) {
  const options = new Map()

  for (const artwork of artworks) {
    const key = getMediumKey(artwork)

    if (!key) {
      continue
    }

    const existing = options.get(key)

    if (existing) {
      existing.count += 1
    } else {
      const label = String(artwork.medium).trim().replace(/\s+/g, ' ')
      options.set(key, { value: key, label, count: 1 })
    }
  }

  return Array.from(options.values()).sort((first, second) =>
    first.label.localeCompare(second.label),
  )
}

// ----- URL <-> filter state -------------------------------------------------
// Keeping filters in the URL means "Back to gallery" from an artwork returns
// to the same filtered view, and a filtered view can be shared as a link.

export function readFiltersFromParams(searchParams) {
  const availability = searchParams.get('availability') ?? 'all'

  return {
    mood: searchParams.get('mood') || 'All',
    availability: AVAILABILITY_ORDER.includes(availability)
      ? availability
      : 'all',
    medium: (searchParams.get('medium') || 'all').toLowerCase(),
    query: searchParams.get('q') ?? '',
    savedOnly: searchParams.get('saved') === '1',
  }
}

export function buildResultsPath(filters) {
  const params = new URLSearchParams()

  params.set('view', 'results')
  params.set('category', filters.category ?? 'all')

  if (filters.mood && filters.mood !== 'All') {
    params.set('mood', filters.mood)
  }

  if (filters.availability && filters.availability !== 'all') {
    params.set('availability', filters.availability)
  }

  if (filters.medium && filters.medium !== 'all') {
    params.set('medium', filters.medium)
  }

  if (filters.query?.trim()) {
    params.set('q', filters.query.trim())
  }

  if (filters.savedOnly) {
    params.set('saved', '1')
  }

  return `/gallery?${params.toString()}`
}
