import { useEffect, useState } from 'react'
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
} from 'react-router'
import AboutPage from './pages/AboutPage'
import CommissionsPage from './pages/CommissionsPage'
import GalleryPage from './pages/GalleryPage'
import HomePage from './pages/HomePage'
import ArtworkDetailPage from './pages/ArtworkDetailPage'
import './App.css'

const navigationItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/gallery', label: 'Gallery' },
  { to: '/about', label: 'About' },
  { to: '/commissions', label: 'Commissions' },
]

function getInitialTheme() {
  try {
    const savedTheme = localStorage.getItem('kalavista-theme')

    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme
    }
  } catch {
    // Use system theme if browser storage is unavailable.
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return null
}

function App() {
  const [theme, setTheme] = useState(getInitialTheme)
  const { pathname } = useLocation()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme

    try {
      localStorage.setItem('kalavista-theme', theme)
    } catch {
      // The theme still works for the current visit.
    }
  }, [theme])


  function toggleTheme() {
    setTheme((currentTheme) =>
      currentTheme === 'light' ? 'dark' : 'light',
    )
  }

  return (
    <main className="app" data-theme={theme} id="top">
      <ScrollToTop />

      <header
  className={`site-header ${
    pathname === '/' ? 'site-header--overlay' : 'site-header--page'
  }`}
>
  <Link className="wordmark" to="/" aria-label="KalaVista home">
    <span className="wordmark-kala">कला</span>
    <span className="wordmark-name">KalaVista</span>
  </Link>

  <nav className="site-navigation" aria-label="Primary navigation">
    {navigationItems.map(({ to, label, end }) => (
      <NavLink
        className={({ isActive }) =>
          `nav-link${isActive ? ' nav-link--active' : ''}`
        }
        end={end}
        key={to}
        to={to}
      >
        {label}
      </NavLink>
    ))}
  </nav>

  <button
    className="theme-toggle"
    type="button"
    onClick={toggleTheme}
    aria-pressed={theme === 'dark'}
    aria-label={`Switch to ${
      theme === 'light' ? 'dark' : 'light'
    } theme`}
  >
    <span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
    {theme === 'light' ? 'Night' : 'Light'}
  </button>
</header>
      
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/commissions" element={<CommissionsPage />} />
        <Route path="/artworks/:slug" element={<ArtworkDetailPage />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </main>
  )
}

export default App