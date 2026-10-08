import { useState } from 'react'
import { useNavigate } from 'react-router'
import './AdminPages.css'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

const ADMIN_SESSION_KEY = 'kalavista-admin-session'

function AdminLoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    setIsSubmitting(true)
    setMessage('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
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
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              required
            />
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
