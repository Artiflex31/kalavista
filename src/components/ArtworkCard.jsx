import { Link } from 'react-router'

function getArtworkImage(artwork) {
  return artwork.image ?? artwork.imageUrl ?? ''
}

function getPriceLabel(artwork) {
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

function ArtworkCard({ artwork, returnTo }) {
  const image = getArtworkImage(artwork)
  const priceLabel = getPriceLabel(artwork)
  const isSold = artwork.availability === 'SOLD'

  return (
    <article className="art-card">
      <Link
        to={`/artworks/${artwork.slug}${
          returnTo ? `?from=${encodeURIComponent(returnTo)}` : ''
        }`}
      >
        <div className="artwork-preview">
          {image ? (
            <img className="artwork-image" src={image} alt={artwork.alt} />
          ) : (
            <div className="artwork-image-fallback" aria-hidden="true">
              कला
            </div>
          )}

          <span className="artwork-year">{artwork.year}</span>
        </div>

        <div className="art-card-content">
          <div className="art-card-content__title-row">
            <h3>{artwork.title}</h3>

            <span
              className={`art-card-price ${
                isSold ? 'art-card-price--sold' : ''
              }`}
            >
              {priceLabel}
            </span>
          </div>

          <p>{artwork.medium}</p>
        </div>
      </Link>
    </article>
  )
}

export default ArtworkCard
