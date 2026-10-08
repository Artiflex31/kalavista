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
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminLoginPage from './pages/AdminLoginPage'
import ArtworkDetailPage from './pages/ArtworkDetailPage'
import CommissionsPage from './pages/CommissionsPage'
import GalleryPage from './pages/GalleryPage'
import HomePage from './pages/HomePage'
import CheckoutPage from './pages/CheckoutPage'
import CommissionPaymentPage from './pages/CommissionPaymentPage'
import CommissionStatusPage from './pages/CommissionStatusPage'
import OrderStatusPage from './pages/OrderStatusPage'
import CommissionFinalPaymentPage from './pages/CommissionFinalPaymentPage'
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
    // Continue with the system preference.
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function getAdminLoginState() {
  try {
    return Boolean(sessionStorage.getItem('kalavista-admin-session'))
  } catch {
    return false
  }
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return null
}

function App() {
  // Every Hook is inside this component — this prevents the invalid Hook error.
  const location = useLocation()

  const [isGalleryVisible, setIsGalleryVisible] = useState(false)
  const [theme, setTheme] = useState(getInitialTheme)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(getAdminLoginState)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme

    try {
      localStorage.setItem('kalavista-theme', theme)
    } catch {
      // Theme still works for this browser session.
    }
  }, [theme])

  useEffect(() => {
    setIsAdminLoggedIn(getAdminLoginState())
  }, [location.pathname])

  function toggleGallery() {
    if (isGalleryVisible) {
      setIsGalleryVisible(false)
      return
    }

    setIsGalleryVisible(true)

    const shouldReduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    window.setTimeout(() => {
      document.getElementById('gallery')?.scrollIntoView({
        behavior: shouldReduceMotion ? 'auto' : 'smooth',
        block: 'start',
      })
    }, 0)
  }

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'))
  }

  return (
    <main className="app" data-theme={theme} id="top">
      <ScrollToTop />

      <header
        className={`site-header ${
          location.pathname === '/'
            ? 'site-header--overlay'
            : 'site-header--page'
        }`}
      >
        <Link className="wordmark" to="/" aria-label="KalaVista home">
          <span className="wordmark-kala">कला</span>
          <span>KalaVista</span>
        </Link>

        <nav className="site-navigation" aria-label="Primary navigation">
          {navigationItems.map(({ to, label, end }) => (
            <NavLink className="nav-link" end={end} key={to} to={to}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          {isAdminLoggedIn && (
            <Link className="admin-studio-link" to="/admin">
              Studio ↗
            </Link>
          )}

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
        </div>
      </header>

      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              isGalleryVisible={isGalleryVisible}
              onToggleGallery={toggleGallery}
            />
          }
        />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/commissions" element={<CommissionsPage />} />
        <Route path="/artworks/:slug" element={<ArtworkDetailPage />} />
        <Route path="/checkout/:slug" element={<CheckoutPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route
          path="/commission-payment/:reference"
          element={<CommissionPaymentPage />}
        />
        <Route
          path="/commission-status/:trackingReference"
          element={<CommissionStatusPage />}
        />
        <Route path="/order-status/:reference" element={<OrderStatusPage />} />
        <Route
          path="/commission-final-payment/:reference"
          element={<CommissionFinalPaymentPage />}
        />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </main>
  )
}

export default App
