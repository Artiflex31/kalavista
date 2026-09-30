import { Link, useParams } from 'react-router'
import artworks from '../data/artworks'

function ArtworkDetailPage() {
  const { slug } = useParams()

  const artwork = artworks.find((item) => item.slug === slug)

  if (!artwork) {
    return (
      <section className="page-shell" aria-labelledby="missing-artwork-title">
        <div className="empty-state">
          <div>
            <h1 id="missing-artwork-title">Artwork not found.</h1>
            <p>
              This work may have moved, or the link may be incorrect.
            </p>
            <Link className="page-action" to="/gallery">
              Back to gallery
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      className="artwork-detail"
      aria-labelledby="artwork-detail-title"
    >
      <Link className="back-link" to="/gallery">
        ← Back to gallery
      </Link>

      <div className="artwork-detail-grid">
        <figure className="artwork-detail-image-frame">
          <img
            className="artwork-detail-image"
            src={artwork.image}
            alt={artwork.alt}
          />
        </figure>

        <div className="artwork-detail-content">
          <p className="section-label">ORIGINAL ARTWORK</p>

          <h1 id="artwork-detail-title">{artwork.title}</h1>

          <p className="artwork-detail-medium">
            {artwork.medium}
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
              <dd>{artwork.dimensions}</dd>
            </div>

            <div>
              <dt>Collection</dt>
              <dd>{artwork.collection}</dd>
            </div>

            <div>
              <dt>Availability</dt>
              <dd>{artwork.availability}</dd>
            </div>
          </dl>

          <Link className="page-action" to="/commissions">
            Enquire about this artwork
          </Link>
        </div>
      </div>
    </section>
  )
}

export default ArtworkDetailPage