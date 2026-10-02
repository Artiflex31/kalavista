import { useState } from 'react'
import { Link } from 'react-router'
import artworks from '../data/artworks'
import './FeaturedWorks.css'

const studioNotes = [
  'A rain-soaked beginning.',
  'A warm mark left behind.',
  'Light held after dusk.',
]

function getArtworkImage(artwork) {
  return artwork.image ?? artwork.imageUrl ?? artwork.coverImage ?? ''
}

function FeaturedWorks() {
  const markedFeatured = artworks.filter((artwork) => artwork.featured)

  const featuredWorks = (
    markedFeatured.length > 0 ? markedFeatured : artworks
  ).slice(0, 3)

  const [activeIndex, setActiveIndex] = useState(0)
  const [previewArtworkId, setPreviewArtworkId] = useState(null)

  if (featuredWorks.length === 0) {
    return null
  }

  const activeWork = featuredWorks[activeIndex]
  const activeImage = getArtworkImage(activeWork)
  const detailPath = activeWork.slug
    ? `/artworks/${activeWork.slug}`
    : '/gallery'

    function moveArtwork(direction) {
    setActiveIndex((currentIndex) => {
      const nextIndex =
        (currentIndex + direction + featuredWorks.length) %
        featuredWorks.length

      return nextIndex
    })
  }

  return (
    <section
      className="featured-works"
      id="gallery"
      aria-labelledby="featured-works-title"
    >
      <div className="featured-works__inner">
        <header className="featured-works__header">
          <div>
            <p className="featured-works__eyebrow">
              ARRIVAL / THE STUDIO EDIT
            </p>

            <h2 id="featured-works-title">
              Pause with
              <span>one artwork.</span>
            </h2>
          </div>

          <p className="featured-works__intro">
            Choose a work below. Its story, colour, and presence take centre
            stage—like stepping closer to a canvas in a quiet studio.
          </p>
        </header>

        <div className="featured-works__stage">
          <div className="featured-works__copy">
            <p className="featured-works__counter">
              {String(activeIndex + 1).padStart(2, '0')} /{' '}
              {String(featuredWorks.length).padStart(2, '0')}
            </p>

            <h3>{activeWork.title}</h3>

            <p className="featured-works__meta">
              {activeWork.medium ?? 'Original artwork'}
              {activeWork.year ? ` · ${activeWork.year}` : ''}
            </p>

            <p className="featured-works__description">
              {activeWork.description ??
                'An original work made slowly, with colour, texture, and memory.'}
            </p>

            <Link className="featured-works__story-link" to={detailPath}>
              Read the artwork story <span aria-hidden="true">↗</span>
            </Link>

            <div className="featured-works__controls">
              <button
                type="button"
                onClick={() => moveArtwork(-1)}
                aria-label="Show previous featured artwork"
              >
                <span aria-hidden="true">←</span>
                Previous
              </button>

              <button
                type="button"
                onClick={() => moveArtwork(1)}
                aria-label="Show next featured artwork"
              >
                Next
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          <div className="featured-works__art-area">
  <p className="featured-works__art-label">CURRENTLY IN FOCUS</p>
  <div className="featured-works__halo" aria-hidden="true" />

  <div className="featured-works__frame" key={activeWork.id}>
    {activeImage ? (
      <img
        className="featured-works__image"
        src={activeImage}
        alt={activeWork.title}
      />
    ) : (
      <div className="featured-works__image-fallback">कला</div>
    )}
  </div>

  <p className="featured-works__note">
    {studioNotes[activeIndex]}
  </p>
</div>
        </div>

        <div
            className="featured-works__picker"
            aria-label="Choose or update a featured artwork"
          >
            {featuredWorks.map((artwork, index) => {
              const image = getArtworkImage(artwork)
              const isActive = index === activeIndex
              const isPreviewingUpdate = previewArtworkId === artwork.id

              return (
                <div className="featured-works__picker-item" key={artwork.id}>
                <button
                  className={`featured-works__picker-button ${
                    isActive ? 'featured-works__picker-button--active' : ''
                  }`}
                  type="button"
                  aria-pressed={isActive}
                  aria-label={`Show ${artwork.title}`}
                  onClick={() => setActiveIndex(index)}
                >
                  {image ? (
                    <img src={image} alt="" />
                  ) : (
                    <span className="featured-works__thumbnail-fallback">
                      कला
                    </span>
                  )}

                  <span>
                    <strong>{String(index + 1).padStart(2, '0')}</strong>
                    {artwork.title}
                  </span>
                </button>

                <button
                  className="featured-works__picker-update"
                  type="button"
                  onClick={() => setPreviewArtworkId(artwork.id)}
                  aria-label={`Update preview for ${artwork.title}`}
                >
                  <span aria-hidden="true">✦</span>
                  Update
                </button>

                {isPreviewingUpdate && (
                  <span className="featured-works__picker-status" role="status">
                    Preview only
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <Link className="featured-works__gallery-link" to="/gallery">
          View every work in the gallery <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  )
}

export default FeaturedWorks