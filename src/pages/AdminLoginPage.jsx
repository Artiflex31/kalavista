import { useState } from 'react'
import { useNavigate } from 'react-router'
import './AdminPages.css'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
const ADMIN_SESSION_KEY = 'kalavista-admin-session'

function AdminLoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Naya State: Password dikhana hai ya chhupana hai
  const [showPassword, setShowPassword] = useState(false)

  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    // ... (Ye function waise hi rahega, kuch change nahi karna)
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.message ?? 'Could not sign in.')
      }

      sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(result.data))
      navigate('/admin', { replace: true })
    } catch (error) {
      setMessage(error.message ?? 'Could not sign in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="admin-page admin-login-page">
      <div className="admin-login-card">
        <p className="admin-eyebrow">KALAVISTA / PRIVATE STUDIO</p>
        <h1>Artist login.</h1>
        <p className="admin-intro">
          Sign in to review enquiries and manage your studio workflow.
        </p>

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <label htmlFor="admin-email">
            Email address
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label htmlFor="admin-password">
            Password
            {/* Naya Wrapper Password Input ke liye */}
            <div className="password-input-wrapper">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  // Eye Off Icon (Hide)
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  // Eye Icon (Show)
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          <button
            className="admin-primary-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Enter the studio'}
            <span aria-hidden="true">↗</span>
          </button>

          {message && (
            <p className="admin-form-message" role="alert">
              {message}
            </p>
          )}
        </form>
      </div>
    </section>
  )
}

export default AdminLoginPage
