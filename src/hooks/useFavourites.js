import { useCallback, useSyncExternalStore } from 'react'
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  toggleFavourite,
} from '../lib/favouritesStore'

function useFavourites() {
  const slugs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const isFavourite = useCallback((slug) => slugs.includes(slug), [slugs])

  return { slugs, count: slugs.length, isFavourite, toggleFavourite }
}

export default useFavourites
