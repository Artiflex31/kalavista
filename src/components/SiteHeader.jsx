import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import './SiteHeader.css'

const navItems = [
  { label: 'Home', to: '/', end: true },
  { label: 'Gallery', to: '/gallery' },
  { label: 'About', to: '/about' },
  { label: 'Commissions', to: '/commissions' },
]

function SiteHeader({ theme, onToggleTheme }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const overlaysHero = pathname === '/'

  return (
    <header
      className={`site-header ${
        overlaysHero ? 'site-header--overlay' : 'site-header--surface'
      }`}
      data-menu-open={isMenuOpen}
    >
      <Link
        className="wordmark"
        to="/"
        aria-label="KalaVista home"
        onClick={() => setIsMenuOpen(false)}
      >
        <span className="wordmark__kala">कला</span>
        <span className="wordmark__name">KalaVista</span>
      </Link>

      <button
        className="site-header__menu"
        type="button"
        aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-controls="primary-navigation"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((open) => !open)}
      >
        <span />
        <span />
      </button>

      <nav
        className="site-nav"
        id="primary-navigation"
        aria-label="Primary navigation"
      >
        {navItems.map(({ label, to, end }) => (
          <NavLink
            className={({ isActive }) =>
              `site-nav__link${isActive ? ' site-nav__link--active' : ''}`
            }
            end={end}
            key={to}
            to={to}
            onClick={() => setIsMenuOpen(false)}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <button
        className="site-header__theme"
        type="button"
        onClick={onToggleTheme}
        aria-label={`Switch to ${
          theme === 'light' ? 'dark' : 'light'
        } theme`}
      >
        <span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
        <span>{theme === 'light' ? 'Night' : 'Light'}</span>
      </button>
    </header>
  )
}

export default SiteHeader