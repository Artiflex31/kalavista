import ArtworkCard from '../components/ArtworkCard'
import artworks from '../data/artworks'

function GalleryPage() {
  return (
    <section
      className="gallery gallery--enter gallery-page"
      aria-labelledby="gallery-page-title"
    >
      <div className="gallery-heading">
        <div>
          <p className="section-label">THE FULL COLLECTION</p>
          <h1 id="gallery-page-title">Artwork for lingering with.</h1>
        </div>

        <p>Explore the current KalaVista collection.</p>
      </div>

      <div className="art-grid">
        {artworks.map((artwork, index) => (
          <div
            className="gallery-item"
            key={artwork.id}
            style={{ '--reveal-delay': `${index * 80}ms` }}
          >
            <ArtworkCard artwork={artwork} />
          </div>
        ))}
      </div>
    </section>
  )
}

export default GalleryPage