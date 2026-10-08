import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import AdminArtworkForm from '../components/AdminArtworkForm'
import AdminArtworkManager from '../components/AdminArtworkManager'
import AdminOrders from '../components/AdminOrders'
import AdminCommissionQuote from '../components/AdminCommissionQuote'
import AdminCommissionProgress from '../components/AdminCommissionProgress'
import AdminCommissionFinalPayment from '../components/AdminCommissionFinalPayment'
import './AdminPages.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

const statusOptions = ['NEW', 'REVIEWING', 'ACCEPTED', 'DECLINED']

function readAdminSession() {
  try {
    const savedSession = sessionStorage.getItem('kalavista-admin-session')

    if (!savedSession) {
      return null
    }

    const parsedSession = JSON.parse(savedSession)

    return parsedSession?.token ? parsedSession : null
  } catch {
    return null
  }
}

function formatBudget(budget) {
  if (!budget) {
    return 'Not specified'
  }

  return budget.replace(/\?/g, '\u20B9')
}

function AdminDashboardPage() {
  // All Hooks must stay inside this function.
  const navigate = useNavigate()

  const [session, setSession] = useState(readAdminSession)
  const [enquiries, setEnquiries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [message, setMessage] = useState('')
  const [artworkRefreshKey, setArtworkRefreshKey] = useState(0)

  useEffect(() => {
    if (!session?.token) {
      setIsLoading(false)
      return
    }

    let isCancelled = false

    async function loadEnquiries() {
      setIsLoading(true)

      try {
        const response = await fetch(`${API_URL}/api/commission-enquiries`, {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.message ?? 'Could not load enquiries.')
        }

        if (!isCancelled) {
          setEnquiries(result.data ?? [])
        }
      } catch (error) {
        if (!isCancelled) {
          setMessage(error.message ?? 'Could not load enquiries.')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadEnquiries()

    return () => {
      isCancelled = true
    }
  }, [session])

  async function updateEnquiryStatus(enquiryId, status) {
    setUpdatingId(enquiryId)
    setMessage('')

    try {
      const response = await fetch(
        `${API_URL}/api/commission-enquiries/${enquiryId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({ status }),
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message ?? 'Could not update enquiry.')
      }

      setEnquiries((currentEnquiries) =>
        currentEnquiries.map((enquiry) =>
          enquiry.id === enquiryId
            ? { ...enquiry, status: result.data.status }
            : enquiry,
        ),
      )

      setMessage('Commission status updated.')
    } catch (error) {
      setMessage(error.message ?? 'Could not update enquiry.')
    } finally {
      setUpdatingId(null)
    }
  }

  function handleSignOut() {
    try {
      sessionStorage.removeItem('kalavista-admin-session')
    } catch {
      // Navigation still takes the user out of the dashboard.
    }

    setSession(null)
    navigate('/admin/login', { replace: true })
  }

  if (!session) {
    return (
      <section className="admin-page">
        <div className="admin-empty-state">
          <p className="admin-eyebrow">KALAVISTA STUDIO</p>
          <h1>Sign in to manage your archive.</h1>
          <Link className="admin-primary-button" to="/admin/login">
            Go to admin sign in
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="admin-page" aria-labelledby="admin-dashboard-title">
      <header className="admin-dashboard-header">
        <div>
          <p className="admin-eyebrow">KALAVISTA STUDIO</p>
          <h1 id="admin-dashboard-title">Artist dashboard</h1>
          <p>
            Publish artworks, manage your archive, and respond to commission
            enquiries.
          </p>
        </div>

        <button
          className="admin-signout-button"
          type="button"
          onClick={handleSignOut}
        >
          Sign out
        </button>
      </header>

      <AdminArtworkForm
        token={session.token}
        onArtworkCreated={(artwork) => {
          setMessage(`Artwork published: ${artwork.title}`)
          setArtworkRefreshKey((currentKey) => currentKey + 1)
        }}
      />

      <AdminArtworkManager
        token={session.token}
        refreshKey={artworkRefreshKey}
      />
      <AdminOrders token={session.token} />
      <section
        className="admin-enquiries"
        aria-labelledby="commission-enquiries-title"
      >
        <div className="admin-enquiries__heading">
          <div>
            <p className="admin-eyebrow">COLLECTOR INBOX</p>
            <h2 id="commission-enquiries-title">Commission enquiries</h2>
          </div>

          <span>{enquiries.length} total</span>
        </div>

        {message && (
          <p className="admin-form-message" role="status">
            {message}
          </p>
        )}

        {isLoading ? (
          <p className="admin-empty-copy">Loading commission enquiries…</p>
        ) : enquiries.length === 0 ? (
          <p className="admin-empty-copy">
            No commission enquiries yet. New requests will appear here.
          </p>
        ) : (
          <div className="admin-enquiries__list">
            {enquiries.map((enquiry) => (
              <article className="admin-enquiry-card" key={enquiry.id}>
                <div className="admin-enquiry-card__top">
                  <div>
                    <p>{enquiry.artworkType}</p>
                    <h3>{enquiry.name}</h3>
                    <a href={`mailto:${enquiry.email}`}>{enquiry.email}</a>
                  </div>

                  <label className="admin-status-control">
                    <span>Status</span>
                    <select
                      value={enquiry.status}
                      disabled={updatingId === enquiry.id}
                      onChange={(event) =>
                        updateEnquiryStatus(enquiry.id, event.target.value)
                      }
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0) + status.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <p className="admin-enquiry-card__message">{enquiry.message}</p>

                <dl className="admin-enquiry-card__facts">
                  <div>
                    <dt>Budget</dt>
                    <dd>{formatBudget(enquiry.budget)}</dd>
                  </div>

                  <div>
                    <dt>Timeline</dt>
                    <dd>{enquiry.timeline || 'Not specified'}</dd>
                  </div>

                  <div>
                    <dt>Artwork reference</dt>
                    <dd>
                      {enquiry.artwork?.title ?? 'General commission enquiry'}
                    </dd>
                  </div>
                </dl>
                <AdminCommissionQuote enquiry={enquiry} token={session.token} />
                <AdminCommissionProgress
                  enquiry={enquiry}
                  token={session.token}
                  onProgressUpdated={(updatedEnquiry) => {
                    setEnquiries((currentEnquiries) =>
                      currentEnquiries.map((currentEnquiry) =>
                        currentEnquiry.id === updatedEnquiry.id
                          ? { ...currentEnquiry, ...updatedEnquiry }
                          : currentEnquiry,
                      ),
                    )
                  }}
                />
                <AdminCommissionFinalPayment
                  enquiry={enquiry}
                  token={session.token}
                />
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}

export default AdminDashboardPage
