import { useEffect, useRef, useState } from 'react'
import './CategoryConveyor.css'

const TAU = Math.PI * 2

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum)
}

function getArtworkImage(artwork) {
  return artwork?.image ?? artwork?.imageUrl ?? artwork?.coverImage ?? ''
}

function getCardArtwork(category, index, allArtworks) {
  if (category.imageUrl) {
    return category.imageUrl
  }

  const matchingArtwork = allArtworks.find((artwork) =>
    (artwork.categories ?? []).includes(category.value),
  )

  if (matchingArtwork) {
    return getArtworkImage(matchingArtwork)
  }

  const fallbackArtwork =
    allArtworks.length > 0 ? allArtworks[index % allArtworks.length] : null

  return getArtworkImage(fallbackArtwork)
}

function getFocusedIndex(categoryCount, phase) {
  let focusedIndex = 0
  let closestToFront = -Infinity

  for (let index = 0; index < categoryCount; index += 1) {
    const angle = ((index - phase) / categoryCount) * TAU
    const frontValue = Math.cos(angle)

    if (frontValue > closestToFront) {
      closestToFront = frontValue
      focusedIndex = index
    }
  }

  return focusedIndex
}

function useIsCompact() {
  const [isCompact, setIsCompact] = useState(false)

  useEffect(() => {
    const query = window.matchMedia(
      '(max-width: 760px), (pointer: coarse), (prefers-reduced-motion: reduce)',
    )

    function update() {
      setIsCompact(query.matches)
    }

    update()
    query.addEventListener('change', update)

    return () => query.removeEventListener('change', update)
  }, [])

  return isCompact
}

function MobileCategoryGrid({ categories, onSelectCategory, artworks }) {
  return (
    <section
      className="category-mobile-grid"
      aria-labelledby="category-mobile-title"
    >
      <header className="category-mobile-grid__header">
        <p className="category-mobile-grid__eyebrow">THE KALAVISTA ARCHIVE</p>
        <h1 id="category-mobile-title">Browse the studio.</h1>
        <p className="category-mobile-grid__intro">
          Tap any category to see the works inside.
        </p>
      </header>

      <ul className="category-mobile-grid__list">
        {categories.map((category, index) => {
          const artworkCount = category.count ?? 0
          const artworkCountText =
            artworkCount === 0
              ? 'Coming soon'
              : artworkCount === 1
                ? '1 work'
                : `${artworkCount} works`
          const cardImage = getCardArtwork(category, index, artworks)

          return (
            <li key={category.value}>
              <button
                className="category-mobile-grid__card"
                type="button"
                onClick={() => onSelectCategory(category.value)}
                style={{ '--card-accent': category.accent ?? '#9c4135' }}
              >
                <span className="category-mobile-grid__art" aria-hidden="true">
                  {cardImage ? (
                    <img src={cardImage} alt="" loading="lazy" />
                  ) : null}
                </span>

                <span className="category-mobile-grid__body">
                  <strong>{category.label}</strong>
                  <small>{artworkCountText}</small>
                </span>

                <span
                  className="category-mobile-grid__arrow"
                  aria-hidden="true"
                >
                  ↗
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function CategoryConveyor({
  categories,
  selectedCategory,
  onSelectCategory,
  artworks = [],
}) {
  const conveyorRef = useRef(null)
  const isCompact = useIsCompact()

  const [scrollProgress, setScrollProgress] = useState(0)
  const [viewport, setViewport] = useState({
    width: 1280,
    height: 800,
  })

  useEffect(() => {
    function updateViewport() {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    updateViewport()
    window.addEventListener('resize', updateViewport)

    return () => {
      window.removeEventListener('resize', updateViewport)
    }
  }, [])

  useEffect(() => {
    if (isCompact) {
      return undefined
    }

    let animationFrameId = 0

    function updateScrollProgress() {
      animationFrameId = 0

      const conveyor = conveyorRef.current

      if (!conveyor) {
        return
      }

      const bounds = conveyor.getBoundingClientRect()
      const scrollableDistance = Math.max(
        1,
        conveyor.offsetHeight - window.innerHeight,
      )

      const nextProgress = clamp(-bounds.top / scrollableDistance, 0, 1)

      setScrollProgress((currentProgress) => {
        if (Math.abs(currentProgress - nextProgress) < 0.002) {
          return currentProgress
        }

        return nextProgress
      })
    }

    function requestScrollUpdate() {
      if (animationFrameId) {
        return
      }

      animationFrameId = window.requestAnimationFrame(updateScrollProgress)
    }

    updateScrollProgress()

    window.addEventListener('scroll', requestScrollUpdate, { passive: true })
    window.addEventListener('resize', requestScrollUpdate)

    return () => {
      window.removeEventListener('scroll', requestScrollUpdate)
      window.removeEventListener('resize', requestScrollUpdate)

      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [isCompact])

  if (categories.length === 0) {
    return null
  }

  // Mobile / coarse pointer / reduced-motion: simple grid.
  if (isCompact) {
    return (
      <MobileCategoryGrid
        categories={categories}
        onSelectCategory={onSelectCategory}
        artworks={artworks}
      />
    )
  }

  const totalRotationSteps = categories.length * 1.35
  const phase = scrollProgress * totalRotationSteps
  const focusedIndex = getFocusedIndex(categories.length, phase)
  const focusedCategory = categories[focusedIndex]

  const radiusX = Math.min(viewport.width * 0.4, 600)
  const radiusY = Math.min(viewport.height * 0.26, 225)

  const focusedCount = focusedCategory.count ?? 0
  const focusedCountText =
    focusedCount === 1 ? '1 artwork' : `${focusedCount} artworks`

  return (
    <section
      className="category-conveyor"
      ref={conveyorRef}
      aria-labelledby="category-conveyor-title"
    >
      <div className="category-conveyor__stage">
        <header className="category-conveyor__header">
          <div>
            <p>THE KALAVISTA ARCHIVE</p>
            <span>Scroll through the studio</span>
          </div>

          <button
            className="category-conveyor__all-button"
            type="button"
            onClick={() => onSelectCategory('all')}
          >
            View all works <span aria-hidden="true">↗</span>
          </button>
        </header>

        <div className="category-conveyor__track" aria-hidden="true" />

        <div className="category-conveyor__focus-readout">
          <h1 id="category-conveyor-title">{focusedCategory.label}</h1>
          <span>{focusedCountText} · click the card to explore</span>
        </div>

        <nav
          className="category-conveyor__orbit"
          aria-label="Browse artwork categories"
        >
          <ul className="category-conveyor__orbit-list">
            {categories.map((category, index) => {
              const angle = ((index - phase) / categories.length) * TAU

              const x = Math.sin(angle) * radiusX
              const y = Math.cos(angle) * radiusY

              const depth = (Math.cos(angle) + 1) / 2
              const scale = 0.7 + depth * 0.34
              const opacity = 0.45 + depth * 0.55
              const saturation = 0.55 + depth * 0.45
              const brightness = 0.72 + depth * 0.28
              const zPosition = Math.round(depth * 80)

              const isFocused = index === focusedIndex
              const isSelected = category.value === selectedCategory
              const artworkCount = category.count ?? 0

              const artworkCountText =
                artworkCount === 0
                  ? 'Coming soon'
                  : artworkCount === 1
                    ? '1 work'
                    : `${artworkCount} works`
              const cardImage = getCardArtwork(category, index, artworks)

              return (
                <li
                  className="category-conveyor__orbit-position"
                  key={category.value}
                  style={{
                    transform: `translate3d(${x}px, ${y}px, ${zPosition}px)`,
                    zIndex: Math.round(depth * 100) + 10,
                  }}
                >
                  <button
                    className={`category-conveyor__card ${
                      isFocused ? 'category-conveyor__card--focused' : ''
                    } ${isSelected ? 'category-conveyor__card--selected' : ''}`}
                    type="button"
                    data-pattern={index % 4}
                    aria-pressed={isSelected}
                    aria-label={`Open ${category.label}, ${artworkCountText}`}
                    onClick={() => onSelectCategory(category.value)}
                    style={{
                      '--category-accent': category.accent ?? '#9c4135',
                      '--depth-scale': scale.toFixed(3),
                      '--card-opacity': opacity.toFixed(3),
                      '--card-saturation': saturation.toFixed(3),
                      '--card-brightness': brightness.toFixed(3),
                    }}
                  >
                    <span
                      className={`category-conveyor__card-art ${
                        cardImage ? '' : 'category-conveyor__card-art--fallback'
                      }`}
                      aria-hidden="true"
                    >
                      {cardImage ? <img src={cardImage} alt="" /> : null}
                    </span>

                    <span className="category-conveyor__card-number">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <span className="category-conveyor__card-content">
                      <strong>{category.label}</strong>
                      <small>{artworkCountText}</small>
                    </span>

                    <span
                      className="category-conveyor__card-arrow"
                      aria-hidden="true"
                    >
                      ↗
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <p className="category-conveyor__scroll-hint">
          Scroll to rotate the rail
        </p>
      </div>
    </section>
  )
}

export default CategoryConveyor
