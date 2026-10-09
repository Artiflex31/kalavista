import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import FavouriteButton from '../components/FavouriteButton'
import artworks from '../data/artworks'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
function getArtworkPriceLabel(artwork) {
  if (artwork.availability === 'SOLD') {
    return 'Sold'
  }

  if (typeof artwork.priceInPaise !== 'number') {
    return 'Price on request'
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: artwork.currency ?? 'INR',
    maximumFractionDigits: 0,
  }).format(artwork.priceInPaise / 100)
}

function formatAvailability(availability) {
  return (availability ?? 'AVAILABLE')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase())
}
function getPurchaseMessage(availability) {
  if (availability === 'SOLD') {
    return 'This original artwork has found its home.'
  }

  if (availability === 'RESERVED') {
    return 'This artwork is currently reserved.'
  }

  if (availability === 'NOT_FOR_SALE') {
    return 'This artwork is not currently for sale.'
  }

  return ''
}
function attachLocalArtworkMedia(apiArtwork) {
  const localArtwork = artworks.find(
    (artwork) => artwork.slug === apiArtwork.slug,
  )

  return {
    ...apiArtwork,
    image: apiArtwork.imageUrl ?? apiArtwork.image ?? localArtwork?.image ?? '',
    alt: apiArtwork.alt ?? localArtwork?.alt ?? apiArtwork.title,
  }
}

function ArtworkDetailPage() {
  const { slug } = useParams()

  const [searchParams] = useSearchParams()

  // Only accept in-site gallery paths, so a crafted ?from= link cannot send
  // the "Back to gallery" button to another website.
  const fromParam = searchParams.get('from')
  const returnTo =
    fromParam && fromParam.startsWith('/gallery')
      ? fromParam
      : '/gallery?view=results&category=all'
  const [artwork, setArtwork] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadArtwork() {
      try {
        setStatus('loading')
        setErrorMessage('')

        const response = await fetch(
          `${API_BASE_URL}/api/artworks/${encodeURIComponent(slug)}`,
          {
            signal: controller.signal,
          },
        )

        if (response.status === 404) {
          setArtwork(null)
          setStatus('missing')
          return
        }

        if (!response.ok) {
          throw new Error(`The API returned status ${response.status}.`)
        }

        const payload = await response.json()

        if (!payload.success || !payload.data) {
          throw new Error('The API returned an unexpected response.')
        }

        setArtwork(attachLocalArtworkMedia(payload.data))
        setStatus('ready')
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setErrorMessage(error.message)
        setStatus('error')
      }
    }

    loadArtwork()

    return () => {
      controller.abort()
    }
  }, [slug])

  if (status === 'loading') {
    return (
      <section className="page-shell" aria-live="polite">
        <div className="empty-state">
          <div>
            <h1>Loading artwork...</h1>
            <p>Preparing this work from the KalaVista archive.</p>
          </div>
        </div>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="page-shell" aria-labelledby="artwork-error-title">
        <div className="empty-state">
          <div>
            <h1 id="artwork-error-title">Artwork could not load.</h1>
            <p>Please check that the KalaVista API is running and try again.</p>
            <p>{errorMessage}</p>

            <Link className="page-action" to="/gallery">
              Return to gallery
            </Link>
          </div>
        </div>
      </section>
    )
  }

  if (status === 'missing' || !artwork) {
    return (
      <section className="page-shell" aria-labelledby="missing-artwork-title">
        <div className="empty-state">
          <div>
            <h1 id="missing-artwork-title">Artwork not found.</h1>
            <p>This work may have moved, or the link may be incorrect.</p>

            <Link className="page-action" to="/gallery">
              Return to gallery
            </Link>
          </div>
        </div>
      </section>
    )
  }
  const isAvailableForPurchase = artwork.availability === 'AVAILABLE'
  const purchaseMessage = getPurchaseMessage(artwork.availability)
  return (
    <section className="artwork-detail" aria-labelledby="artwork-detail-title">
      <Link className="back-link" to={returnTo}>
        ← Back to gallery
      </Link>

      <div className="artwork-detail-grid">
        <figure className="artwork-detail-image-frame">
          {artwork.image ? (
            <img
              className="artwork-detail-image"
              src={artwork.image}
              alt={artwork.alt}
            />
          ) : (
            <div className="artwork-detail-image-fallback" aria-hidden="true">
              कला
            </div>
          )}
        </figure>

        <div className="artwork-detail-content">
          <p className="section-label">ORIGINAL ARTWORK</p>

          <h1 id="artwork-detail-title">{artwork.title}</h1>

          <p className="artwork-detail-medium">{artwork.medium}</p>

          <p
            className={`artwork-detail-price ${
              artwork.availability === 'SOLD'
                ? 'artwork-detail-price--sold'
                : ''
            }`}
          >
            {getArtworkPriceLabel(artwork)}
          </p>

          <p className="artwork-detail-story">{artwork.story}</p>

          <dl className="artwork-facts">
            <div>
              <dt>Year</dt>
              <dd>
                <time dateTime={artwork.year}>{artwork.year}</time>
              </dd>
            </div>

            <div>
              <dt>Dimensions</dt>
              <dd>{artwork.dimensions || '—'}</dd>
            </div>

            <div>
              <dt>Collection</dt>
              <dd>{artwork.collection || '—'}</dd>
            </div>

            <div>
              <dt>Availability</dt>
              <dd>{formatAvailability(artwork.availability)}</dd>
            </div>
          </dl>

          {isAvailableForPurchase ? (
            <Link
              className="page-action"
              to={`/checkout/${encodeURIComponent(artwork.slug)}`}
            >
              Buy this artwork
            </Link>
          ) : (
            <p className="artwork-purchase-unavailable" role="status">
              {purchaseMessage}
            </p>
          )}

          <FavouriteButton
            slug={artwork.slug}
            title={artwork.title}
            variant="text"
          />
        </div>
      </div>
    </section>
  )
}

export default ArtworkDetailPage
