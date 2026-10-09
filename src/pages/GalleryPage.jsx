import { useEffect, useMemo, useRef, useState } from 'react'
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

const categoryDefinitions = [
  { value: 'all', label: 'All works', accent: '#9c4135' },
  {
    value: 'monsoon-studies',
    label: 'Monsoon Studies',
    accent: '#597c9d',
    collection: 'Monsoon Studies',
  },
  {
    value: 'small-messages',
    label: 'Small Messages',
    accent: '#b98a4b',
    collection: 'Small Messages',
  },
  {
    value: 'soil-story',
    label: 'Soil & Story',
    accent: '#a84d3f',
    collection: 'Soil & Story',
  },
  {
    value: 'anime-fan-art',
    label: 'Anime & Fan Art',
    accent: '#7757a7',
    keywords: ['anime', 'fan art', 'fanart', 'manga', 'character'],
  },
  {
    value: 'portrait-studies',
    label: 'Portrait Studies',
    accent: '#a96e5c',
    keywords: ['portrait', 'face study', 'face drawing'],
  },
  {
    value: 'pencil-charcoal',
    label: 'Pencil & Charcoal',
    accent: '#59616b',
    keywords: ['pencil', 'charcoal', 'graphite', 'sketch'],
  },
  {
    value: 'watercolour',
    label: 'Watercolour',
    accent: '#4f8d91',
    keywords: ['watercolour', 'watercolor'],
  },
  {
    value: 'digital-glow',
    label: 'Digital / Glow',
    accent: '#ba5e9b',
    keywords: ['digital', 'glow', 'neon'],
  },
  {
    value: 'wildlife-studies',
    label: 'Wildlife Studies',
    accent: '#6c8654',
    keywords: ['wildlife', 'animal', 'tiger', 'bird'],
  },
]

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

  const matchesCollection =
    category.collection && artwork.collection === category.collection

  const matchesKeyword = (category.keywords ?? []).some((keyword) =>
    getArtworkSearchText(artwork).includes(keyword),
  )

  const matchesUploadedCategory = (artwork.categories ?? []).includes(
    category.value,
  )

  return matchesCollection || matchesKeyword || matchesUploadedCategory
}

function createSlug(title) {
  const normalisedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return normalisedTitle || 'studio-upload'
}

function GalleryPage() {
  const [searchParams] = useSearchParams()

  const requestedCategory = searchParams.get('category') ?? 'all'
  const initialFilters = readFiltersFromParams(searchParams)
  const shouldOpenResults =
    searchParams.get('view') === 'results' || initialFilters.savedOnly

  const initialCategory = categoryDefinitions.some(
    (category) => category.value === requestedCategory,
  )
    ? requestedCategory
    : 'all'
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
  const [apiStatus, setApiStatus] = useState('loading')
  const [apiError, setApiError] = useState('')
  const [reloadCount, setReloadCount] = useState(0)
  const [isSlowLoad, setIsSlowLoad] = useState(false)
  const { slugs: favouriteSlugs } = useFavourites()
  const [uploadedArtworks, setUploadedArtworks] = useState([])
  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(false)
  const [draftFile, setDraftFile] = useState(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftCategory, setDraftCategory] = useState('all')
  const [uploadMessage, setUploadMessage] = useState('')
  const objectUrlsRef = useRef([])
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

  // If the API takes a while (for example a sleeping free-tier server), tell
  // the visitor instead of leaving a silent loading screen.
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

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  // Live data when the API answered. Local preview data only when it failed.
  // While loading there is nothing to show yet, so visitors never see the
  // three local works flash before the real catalogue replaces them.
  const allArtworks = useMemo(() => {
    const sourceArtworks =
      apiStatus === 'ready'
        ? apiArtworks
        : apiStatus === 'error'
          ? artworks
          : []

    return [...uploadedArtworks, ...sourceArtworks]
  }, [apiArtworks, apiStatus, uploadedArtworks])

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

  const categoryOptions = useMemo(
    () =>
      categoryDefinitions.map((category) => ({
        ...category,
        count: allArtworks.filter((artwork) =>
          matchesCategory(artwork, category),
        ).length,
      })),
    [allArtworks],
  )

  const activeCategory =
    categoryDefinitions.find(
      (category) => category.value === selectedCategory,
    ) ?? categoryDefinitions[0]

  const activeCategoryOption =
    categoryOptions.find((category) => category.value === selectedCategory) ??
    categoryOptions[0]

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

  function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null

    setDraftFile(file)
    setUploadMessage('')

    if (file && !draftTitle) {
      setDraftTitle(file.name.replace(/\.[^/.]+$/, ''))
    }
  }

  function handleUpload(event) {
    event.preventDefault()

    if (!draftFile) {
      setUploadMessage('Choose an image before adding it to the gallery.')
      return
    }

    if (!draftFile.type.startsWith('image/')) {
      setUploadMessage('Please choose an image file.')
      return
    }

    if (draftFile.size > 8 * 1024 * 1024) {
      setUploadMessage('Choose an image smaller than 8 MB for this preview.')
      return
    }

    const selectedUploadCategory =
      categoryDefinitions.find(
        (category) => category.value === draftCategory,
      ) ?? categoryDefinitions[0]

    const title = draftTitle.trim() || 'Untitled studio work'
    const imageUrl = URL.createObjectURL(draftFile)

    objectUrlsRef.current.push(imageUrl)

    setUploadedArtworks((currentArtworks) => [
      {
        id: `local-upload-${Date.now()}`,
        slug: `${createSlug(title)}-${Date.now()}`,
        title,
        medium: 'Studio upload',
        year: String(new Date().getFullYear()),
        dimensions: 'Details to be added',
        collection: selectedUploadCategory.collection ?? '',
        categories: [
          selectedUploadCategory.value,
          ...(selectedUploadCategory.keywords ?? []),
        ],
        moods: ['New'],
        availability: 'Available for enquiry',
        image: imageUrl,
        alt: title,
        story: 'A newly added studio work. Its story will be added soon.',
        isLocalUpload: true,
      },
      ...currentArtworks,
    ])

    setSearchQuery('')
    setSelectedMood('All')
    setSelectedCategory(draftCategory)
    setDraftFile(null)
    setDraftTitle('')
    setDraftCategory('all')
    setUploadMessage(
      `Added “${title}” for this browser session. It is ready to preview in the gallery.`,
    )
    event.currentTarget.reset()
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

        <button
          className="gallery-upload-button"
          type="button"
          aria-expanded={isUploadPanelOpen}
          aria-controls="gallery-upload-panel"
          onClick={() => setIsUploadPanelOpen((isOpen) => !isOpen)}
        >
          <span aria-hidden="true">＋</span>
          Upload artwork
        </button>
      </div>

      {isUploadPanelOpen && (
        <form
          className="gallery-upload-panel"
          id="gallery-upload-panel"
          onSubmit={handleUpload}
        >
          <div className="gallery-upload-panel__heading">
            <p>Studio upload / preview</p>
            <span>
              Local to this browser until we build the secure artist dashboard.
            </span>
          </div>

          <label>
            Artwork image
            <input
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              type="file"
            />
          </label>

          <label>
            Title
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="Name this artwork"
              type="text"
            />
          </label>

          <label>
            Category
            <select
              value={draftCategory}
              onChange={(event) => setDraftCategory(event.target.value)}
            >
              {categoryDefinitions.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <button type="submit">Add to gallery</button>

          {uploadMessage && (
            <p className="gallery-upload-panel__status" role="status">
              {uploadMessage}
            </p>
          )}
        </form>
      )}

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
