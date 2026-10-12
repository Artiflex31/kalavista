import { Link } from 'react-router'
import heroBackdrop from '../assets/kalavista-hero-backdrop.webp'
import './HomeStaticHero.css'

function HomeStaticHero() {
  return (
    <section
      className="home-static-hero"
      aria-label="KalaVista art journey"
      style={{ backgroundImage: `url(${heroBackdrop})` }}
    >
      <div className="home-static-hero__overlay" aria-hidden="true" />

      <div className="home-static-hero__content">
        <article className="home-static-hero__card">
          <p className="home-static-hero__eyebrow">KALA SHIKHAR · 01</p>
          <h1>Walk into the canvas.</h1>
          <p>
            A slow route through colour, terrain, memory, and the works that
            stay with you.
          </p>
          <Link className="home-static-hero__link" to="/gallery">
            Explore the gallery <span aria-hidden="true">↗</span>
          </Link>
        </article>

        <nav className="home-static-hero__quick-links" aria-label="Quick links">
          <Link className="home-static-hero__quick-link" to="/commissions">
            Start a commission
          </Link>
          <Link className="home-static-hero__quick-link" to="/about">
            Meet the artist
          </Link>
        </nav>
      </div>
    </section>
  )
}

export default HomeStaticHero
