function ArtworkCard({ artwork }) {
  return (
    <article className="art-card">
      <div className="artwork-preview">
        <img
          className="artwork-image"
          src={artwork.image}
          alt={`${artwork.title} artwork`}
          loading="lazy"
          decoding="async"
        />

        <span className="artwork-year">{artwork.year}</span>
      </div>

      <div className="art-card-content">
        <h3>{artwork.title}</h3>
        <p>{artwork.medium}</p>
      </div>
    </article>
  )
}

export default ArtworkCard