import { useEffect, useRef, useState } from 'react'
import './CategoryConveyor.css'
import artworks from '../data/artworks'

const TAU = Math.PI * 2

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum)
}
function getArtworkImage(artwork) {
  return artwork?.image ?? artwork?.imageUrl ?? artwork?.coverImage ?? ''
}

function getCardArtwork(category, index) {
  const matchingArtwork = artworks.find((artwork) => {
    if (category.value === 'all') {
      return true
    }

    if (category.collection && artwork.collection === category.collection) {
      return true
    }

    const searchableText = [
      artwork.title,
      artwork.collection,
      artwork.medium,
      artwork.story,
      ...(artwork.categories ?? []),
    ]
      .join(' ')
      .toLowerCase()

    return (category.keywords ?? []).some((keyword) =>
      searchableText.includes(keyword),
    )
  })

  const fallbackArtwork =
    artworks.length > 0 ? artworks[index % artworks.length] : null

  return getArtworkImage(matchingArtwork ?? fallbackArtwork)
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

function CategoryConveyor({ categories, selectedCategory, onSelectCategory }) {
  const conveyorRef = useRef(null)

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

    window.addEventListener('scroll', requestScrollUpdate, {
      passive: true,
    })
    window.addEventListener('resize', requestScrollUpdate)

    return () => {
      window.removeEventListener('scroll', requestScrollUpdate)
      window.removeEventListener('resize', requestScrollUpdate)

      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [])

  if (categories.length === 0) {
    return null
  }

  // More than one visual rotation while the visitor scrolls.
  const totalRotationSteps = categories.length * 1.35
  const phase = scrollProgress * totalRotationSteps
  const focusedIndex = getFocusedIndex(categories.length, phase)
  const focusedCategory = categories[focusedIndex]

  // These keep every card within the viewport.
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

              // angle 0 = lower middle/front of the oval
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
              const cardImage = getCardArtwork(category, index)

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
