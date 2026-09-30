import heroBackdrop from '../assets/kalavista-hero-backdrop.webp'
import ArtworkCard from '../components/ArtworkCard'
import artworks from '../data/artworks'

function HomePage({ isGalleryVisible, onToggleGallery }) {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <img className="hero-backdrop" src={heroBackdrop} alt="" />

        <div className="hero-scrim" aria-hidden="true" />

        <div className="hero-content">
          <h1 id="hero-title">Art that stays with you.</h1>

          <p className="hero-script">made to linger</p>

          <p className="description">
            A digital gallery for original artworks, stories, and commissions.
          </p>

          <button
            className="primary-button"
            type="button"
            onClick={onToggleGallery}
            aria-expanded={isGalleryVisible}
            aria-controls="gallery"
          >
            {isGalleryVisible ? 'Hide the gallery' : 'Explore the gallery'}
          </button>
        </div>
      </section>

      {isGalleryVisible && (
        <section className="gallery gallery--enter" id="gallery">
          <div className="gallery-heading">
            <div>
              <p className="section-label">FEATURED WORKS</p>
              <h2>A first look at my studio.</h2>
            </div>

            <p>
              A small selection from the current KalaVista collection.
            </p>
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
      )}
    </>
  )
}

export default HomePage