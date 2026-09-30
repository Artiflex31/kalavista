import { Link } from 'react-router'

function ArtworkCard({ artwork }) {
  return (
    <article className="art-card">
      <Link
        className="art-card-link"
        to={`/artworks/${artwork.slug}`}
        aria-label={`View ${artwork.title}`}
      >
        <div className="artwork-preview">
          <img
            className="artwork-image"
            src={artwork.image}
            alt={artwork.alt}
          />
          <span className="artwork-year">{artwork.year}</span>
        </div>

        <div className="art-card-content">
          <h3>{artwork.title}</h3>
          <p>{artwork.medium}</p>
        </div>
      </Link>
    </article>
  )
}

export default ArtworkCard