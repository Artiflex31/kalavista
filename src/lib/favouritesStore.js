// Browser-local favourites. Stores artwork slugs (never ids, because local
// fallback data and API data can reuse the same numeric ids).
//
// Works with React's useSyncExternalStore (see hooks/useFavourites.js) so every
// heart button on the page stays in sync, including across browser tabs.

const STORAGE_KEY = 'kalavista-favourites'
const MAX_FAVOURITES = 200

const EMPTY_FAVOURITES = []
const listeners = new Set()

let snapshot = readStoredFavourites()
let isListeningToStorage = false

function sanitise(value) {
  if (!Array.isArray(value)) {
    return EMPTY_FAVOURITES
  }

  const seen = new Set()
  const result = []

  for (const item of value) {
    if (typeof item === 'string' && item.trim() !== '' && !seen.has(item)) {
      seen.add(item)
      result.push(item)

      if (result.length >= MAX_FAVOURITES) {
        break
      }
    }
  }

  return result
}

function readStoredFavourites() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    return raw ? sanitise(JSON.parse(raw)) : EMPTY_FAVOURITES
  } catch {
    // Storage blocked or data corrupted: start with an empty list.
    return EMPTY_FAVOURITES
  }
}

function persist(favourites) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favourites))
  } catch {
    // Storage is unavailable (for example private mode). Favourites still
    // work for this page session because the in-memory snapshot is updated.
  }
}

function sameList(first, second) {
  return (
    first.length === second.length &&
    first.every((item, index) => item === second[index])
  )
}

function publish(next) {
  snapshot = next
  listeners.forEach((listener) => listener())
}

function handleStorageEvent(event) {
  // key === null means the whole storage area was cleared.
  if (event.key !== null && event.key !== STORAGE_KEY) {
    return
  }

  const next = readStoredFavourites()

  if (!sameList(next, snapshot)) {
    publish(next)
  }
}

export function subscribe(listener) {
  listeners.add(listener)

  if (!isListeningToStorage && typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageEvent)
    isListeningToStorage = true
  }

  return () => {
    listeners.delete(listener)

    if (listeners.size === 0 && isListeningToStorage) {
      window.removeEventListener('storage', handleStorageEvent)
      isListeningToStorage = false
    }
  }
}

export function getSnapshot() {
  return snapshot
}

export function getServerSnapshot() {
  return EMPTY_FAVOURITES
}

export function toggleFavourite(slug) {
  if (typeof slug !== 'string' || slug.trim() === '') {
    return
  }

  const next = snapshot.includes(slug)
    ? snapshot.filter((item) => item !== slug)
    : [slug, ...snapshot].slice(0, MAX_FAVOURITES)

  persist(next)
  publish(next)
}

export function clearFavourites() {
  persist(EMPTY_FAVOURITES)
  publish(EMPTY_FAVOURITES)
}
