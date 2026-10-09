import { useEffect, useMemo, useState } from 'react'
import ArtworkCard from '../components/ArtworkCard'
import { useSearchParams } from 'react-router'
import CategoryConveyor from '../components/CategoryConveyor'
import artworks from '../data/artworks'
import useFavourites from '../hooks/useFavourites'
import {
  buildAvailabilityOptions,
  buildMediumOptions,
  buildResultsPath,
  matchesAvailability,
  matchesMedium,
  readFiltersFromParams,
} from '../lib/artworkFilters'
import './GalleryPage.css'
import './GalleryFilters.css'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

function attachLocalArtworkMedia(apiArtwork) {
  const localArtwork = artworks.find(
    (artwork) => artwork.slug === apiArtwork.slug,
  )

  return {
    ...apiArtwork,
    image: apiArtwork.imageUrl ?? localArtwork?.image ?? '',
    alt: apiArtwork.alt ?? localArtwork?.alt ?? apiArtwork.title,
  }
}

function getArtworkSearchText(artwork) {
  return [
    artwork.title,
    artwork.medium,
    artwork.collection ?? '',
    artwork.story ?? '',
    artwork.availability ?? '',
    ...(artwork.moods ?? []),
    ...(artwork.categories ?? []),
  ]
    .join(' ')
    .toLowerCase()
}

function matchesCategory(artwork, category) {
  if (category.value === 'all') {
    return true
  }

  return (artwork.categories ?? []).includes(category.value)
}

function GalleryPage() {
  const [searchParams] = useSearchParams()

  const requestedCategory = searchParams.get('category') ?? 'all'
  const initialFilters = readFiltersFromParams(searchParams)
  const shouldOpenResults =
    searchParams.get('view') === 'results' || initialFilters.savedOnly

  const initialCategory = requestedCategory || 'all'

  const [isCategoryIndexOpen, setIsCategoryIndexOpen] = useState(
    () => !shouldOpenResults,
  )

  const [selectedCategory, setSelectedCategory] = useState(
    () => initialCategory,
  )
  const [searchQuery, setSearchQuery] = useState(initialFilters.query)
  const [selectedMood, setSelectedMood] = useState(initialFilters.mood)
  const [selectedAvailability, setSelectedAvailability] = useState(
    initialFilters.availability,
  )
  const [selectedMedium, setSelectedMedium] = useState(initialFilters.medium)
  const [savedOnly, setSavedOnly] = useState(initialFilters.savedOnly)
  const [apiArtworks, setApiArtworks] = useState([])
  const [apiCategories, setApiCategories] = useState([])
  const [apiStatus, setApiStatus] = useState('loading')
  const [apiError, setApiError] = useState('')
  const [reloadCount, setReloadCount] = useState(0)
  const [isSlowLoad, setIsSlowLoad] = useState(false)
  const { slugs: favouriteSlugs } = useFavourites()

  // Load artworks from the API.
  useEffect(() => {
    const controller = new AbortController()

    async function loadArtworks() {
      try {
        setApiStatus('loading')
        setApiError('')

        const response = await fetch(`${API_BASE_URL}/api/artworks`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`The API returned status ${response.status}.`)
        }

        const payload = await response.json()

        if (!payload.success || !Array.isArray(payload.data)) {
          throw new Error('The API returned an unexpected response.')
        }

        setApiArtworks(payload.data.map(attachLocalArtworkMedia))
        setApiStatus('ready')
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setApiError(error.message)
        setApiStatus('error')
      }
    }

    loadArtworks()

    return () => {
      controller.abort()
    }
  }, [reloadCount])

  // Load categories from the API.
  useEffect(() => {
    const controller = new AbortController()

    async function loadCategories() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/categories`, {
          signal: controller.signal,
        })

        const result = await response.json()

        if (response.ok) {
          setApiCategories(result.data ?? [])
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }
        // Non-blocking: conveyor will just have the "all" option.
      }
    }

    loadCategories()

    return () => {
      controller.abort()
    }
  }, [])

  // Tell visitors if the API is taking a while.
  useEffect(() => {
    if (apiStatus !== 'loading') {
      return undefined
    }

    const timerId = window.setTimeout(() => setIsSlowLoad(true), 6000)

    return () => {
      window.clearTimeout(timerId)
      setIsSlowLoad(false)
    }
  }, [apiStatus])

  const allArtworks = useMemo(() => {
    return apiStatus === 'ready'
      ? apiArtworks
      : apiStatus === 'error'
        ? artworks
        : []
  }, [apiArtworks, apiStatus])

  const categoryOptions = useMemo(() => {
    const allOption = {
      value: 'all',
      label: 'All works',
      accent: '#9c4135',
      count: allArtworks.length,
    }

    const fromApi = apiCategories.map((category) => ({
      value: category.slug,
      label: category.label,
      accent: category.accent,
      imageUrl: category.imageUrl,
      alt: category.alt,
      count: allArtworks.filter((artwork) =>
        (artwork.categories ?? []).includes(category.slug),
      ).length,
    }))

    return [allOption, ...fromApi]
  }, [allArtworks, apiCategories])

  const availabilityOptions = useMemo(
    () => buildAvailabilityOptions(allArtworks),
    [allArtworks],
  )

  const mediumOptions = useMemo(
    () => buildMediumOptions(allArtworks),
    [allArtworks],
  )

  const savedCount = useMemo(
    () =>
      allArtworks.filter((artwork) => favouriteSlugs.includes(artwork.slug))
        .length,
    [allArtworks, favouriteSlugs],
  )

  const moodOptions = useMemo(
    () => [
      'All',
      ...Array.from(
        new Set(allArtworks.flatMap((artwork) => artwork.moods ?? [])),
      ),
    ],
    [allArtworks],
  )

  const activeCategory =
    categoryOptions.find((category) => category.value === selectedCategory) ??
    categoryOptions[0]

  const activeCategoryOption = activeCategory

  const filteredArtworks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return allArtworks.filter((artwork) => {
      const matchesSelectedCategory = matchesCategory(artwork, activeCategory)

      const matchesMood =
        selectedMood === 'All' || (artwork.moods ?? []).includes(selectedMood)

      const matchesSearch =
        normalizedQuery === '' ||
        getArtworkSearchText(artwork).includes(normalizedQuery)

      const matchesSaved = !savedOnly || favouriteSlugs.includes(artwork.slug)

      return (
        matchesSelectedCategory &&
        matchesMood &&
        matchesSearch &&
        matchesAvailability(artwork, selectedAvailability) &&
        matchesMedium(artwork, selectedMedium) &&
        matchesSaved
      )
    })
  }, [
    activeCategory,
    allArtworks,
    favouriteSlugs,
    savedOnly,
    searchQuery,
    selectedAvailability,
    selectedMedium,
    selectedMood,
  ])

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedMood !== 'All' ||
    selectedCategory !== 'all' ||
    selectedAvailability !== 'all' ||
    selectedMedium !== 'all' ||
    savedOnly

  const hasNoSavedWorks = savedOnly && savedCount === 0

  const resultsPath = buildResultsPath({
    category: selectedCategory,
    mood: selectedMood,
    availability: selectedAvailability,
    medium: selectedMedium,
    query: searchQuery,
    savedOnly,
  })

  const isFutureCategory =
    selectedCategory !== 'all' && activeCategoryOption.count === 0

  function openCategory(categoryValue) {
    setSelectedCategory(categoryValue)

    if (categoryValue === 'all') {
      setSearchQuery('')
      setSelectedMood('All')
      setSelectedAvailability('all')
      setSelectedMedium('all')
      setSavedOnly(false)
    }

    setIsCategoryIndexOpen(false)

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' })
    })
  }

  function returnToCategoryIndex() {
    setIsCategoryIndexOpen(true)

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' })
    })
  }

  function clearFilters() {
    setSearchQuery('')
    setSelectedMood('All')
    setSelectedAvailability('all')
    setSelectedMedium('all')
    setSavedOnly(false)
    setSelectedCategory('all')
  }

  if (apiStatus === 'loading') {
    return (
      <section
        aria-busy="true"
        aria-labelledby="gallery-loading-title"
        className="page-shell"
        role="status"
      >
        <div className="empty-state">
          <div>
            <h1 id="gallery-loading-title">Loading the gallery...</h1>
            <p>
              {isSlowLoad
                ? 'The studio server is waking up. This can take a moment.'
                : 'Bringing the latest works out of the studio.'}
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (isCategoryIndexOpen) {
    return (
      <CategoryConveyor
        categories={categoryOptions}
        selectedCategory={selectedCategory}
        onSelectCategory={openCategory}
        artworks={allArtworks}
      />
    )
  }

  return (
    <section
      className="gallery gallery--enter gallery-page gallery-page--results"
      aria-labelledby="gallery-page-title"
    >
      {apiStatus === 'error' && (
        <p className="gallery-api-notice" role="status">
          The live gallery could not load right now, so local preview data is
          shown.
          {apiError ? ` ${apiError}` : ''}
          <button
            className="gallery-clear-button gallery-api-notice__retry"
            type="button"
            onClick={() => setReloadCount((count) => count + 1)}
          >
            Try again
          </button>
        </p>
      )}

      <div className="gallery-results-toolbar">
        <button
          className="gallery-index-back"
          type="button"
          onClick={returnToCategoryIndex}
        >
          <span aria-hidden="true">←</span>
          Back to category index
        </button>
      </div>

      <div className="gallery-heading">
        <div>
          <p className="section-label">{activeCategory.label}</p>
          <h1 id="gallery-page-title">
            {activeCategory.value === 'all'
              ? 'All artworks.'
              : `${activeCategory.label}.`}
          </h1>
        </div>

        <p>Search by title or medium, or refine the work by mood.</p>
      </div>

      <div className="gallery-controls">
        <div className="gallery-search">
          <label htmlFor="gallery-search">Search artworks</label>

          <input
            id="gallery-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search title, medium, collection..."
          />
        </div>

        <div
          className="gallery-filter-list"
          role="group"
          aria-label="Filter artworks by mood"
        >
          {moodOptions.map((mood) => (
            <button
              aria-pressed={selectedMood === mood}
              className="filter-chip"
              key={mood}
              onClick={() => setSelectedMood(mood)}
              type="button"
            >
              {mood}
            </button>
          ))}
        </div>

        <div className="gallery-filter-row">
          <button
            aria-pressed={savedOnly}
            className="filter-chip filter-chip--saved"
            onClick={() => setSavedOnly((isOn) => !isOn)}
            type="button"
          >
            <span aria-hidden="true">{savedOnly ? '♥' : '♡'}</span>
            Saved ({savedCount})
          </button>

          {availabilityOptions.length > 1 && (
            <div
              className="gallery-filter-list"
              role="group"
              aria-label="Filter artworks by availability"
            >
              <button
                aria-pressed={selectedAvailability === 'all'}
                className="filter-chip"
                onClick={() => setSelectedAvailability('all')}
                type="button"
              >
                Any availability
              </button>

              {availabilityOptions.map((option) => (
                <button
                  aria-pressed={selectedAvailability === option.value}
                  className="filter-chip"
                  key={option.value}
                  onClick={() => setSelectedAvailability(option.value)}
                  type="button"
                >
                  {option.label} ({option.count})
                </button>
              ))}
            </div>
          )}

          {mediumOptions.length > 1 && (
            <div className="gallery-select">
              <label htmlFor="gallery-medium">Medium</label>

              <select
                id="gallery-medium"
                value={selectedMedium}
                onChange={(event) => setSelectedMedium(event.target.value)}
              >
                <option value="all">All mediums</option>

                {mediumOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="gallery-results-summary" role="status" aria-live="polite">
        <p>
          <strong>{filteredArtworks.length}</strong>{' '}
          {filteredArtworks.length === 1 ? 'artwork' : 'artworks'} found
        </p>

        {hasActiveFilters && (
          <button
            className="gallery-clear-button"
            type="button"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        )}
      </div>

      {filteredArtworks.length > 0 ? (
        <div
          className="art-grid gallery-page__grid"
          key={`${selectedCategory}-${selectedMood}-${searchQuery}-${selectedAvailability}-${selectedMedium}-${savedOnly}`}
        >
          {filteredArtworks.map((artwork, index) => (
            <div
              className="gallery-item"
              key={artwork.id}
              style={{ '--reveal-delay': `${index * 80}ms` }}
            >
              <ArtworkCard artwork={artwork} returnTo={resultsPath} />
            </div>
          ))}
        </div>
      ) : (
        <div className="gallery-empty-state">
          <div>
            <h2>
              {hasNoSavedWorks
                ? 'No saved works yet.'
                : isFutureCategory
                  ? `${activeCategoryOption.label} is on its way.`
                  : 'No artworks found.'}
            </h2>

            <p>
              {hasNoSavedWorks
                ? 'Tap the heart on any artwork to keep it here for later.'
                : isFutureCategory
                  ? 'This category is ready for your upcoming original artworks.'
                  : 'Try another mood, search word, or return to the category index.'}
            </p>

            <button
              className="gallery-clear-button"
              type="button"
              onClick={hasNoSavedWorks ? clearFilters : returnToCategoryIndex}
            >
              {hasNoSavedWorks
                ? 'Browse all works'
                : 'Return to category index'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export default GalleryPage
