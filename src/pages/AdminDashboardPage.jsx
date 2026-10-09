import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import AdminArtworkForm from '../components/AdminArtworkForm'
import AdminArtworkManager from '../components/AdminArtworkManager'
import AdminOrders from '../components/AdminOrders'
import AdminCommissionQuote from '../components/AdminCommissionQuote'
import AdminCommissionProgress from '../components/AdminCommissionProgress'
import AdminCommissionFinalPayment from '../components/AdminCommissionFinalPayment'
import AdminCategoryManager from '../components/AdminCategoryManager'
import './AdminPages.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

const statusOptions = ['NEW', 'REVIEWING', 'ACCEPTED', 'DECLINED']

const adminTabs = [
  { id: 'publish', label: 'Publish artwork', number: '01' },
  { id: 'manage', label: 'Manage artworks', number: '02' },
  { id: 'categories', label: 'Categories', number: '03' },
  { id: 'orders', label: 'Artwork orders', number: '04' },
  { id: 'enquiries', label: 'Commission enquiries', number: '05' },
]

function readAdminSession() {
  try {
    const savedSession = sessionStorage.getItem('kalavista-admin-session')
    if (!savedSession) return null
    const parsedSession = JSON.parse(savedSession)
    return parsedSession?.token ? parsedSession : null
  } catch {
    return null
  }
}

function formatBudget(budget) {
  if (!budget) return 'Not specified'
  return budget.replace(/\?/g, '\u20B9')
}

function AdminDashboardPage() {
  const navigate = useNavigate()

  const [session, setSession] = useState(readAdminSession)
  const [enquiries, setEnquiries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [message, setMessage] = useState('')
  const [artworkRefreshKey, setArtworkRefreshKey] = useState(0)

  const [activeTab, setActiveTab] = useState('publish')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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
          headers: { Authorization: `Bearer ${session.token}` },
        })
        const result = await response.json()
        if (!response.ok)
          throw new Error(result.message ?? 'Could not load enquiries.')
        if (!isCancelled) setEnquiries(result.data ?? [])
      } catch (error) {
        if (!isCancelled)
          setMessage(error.message ?? 'Could not load enquiries.')
      } finally {
        if (!isCancelled) setIsLoading(false)
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
      if (!response.ok)
        throw new Error(result.message ?? 'Could not update enquiry.')

      setEnquiries((current) =>
        current.map((enquiry) =>
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

  async function deleteEnquiry(enquiry) {
    const confirmed = window.confirm(
      `Archive the enquiry from "${enquiry.name}"?\n\nPayment history is preserved. The enquiry is hidden from this dashboard.`,
    )
    if (!confirmed) return

    setDeletingId(enquiry.id)
    setMessage('')

    try {
      const response = await fetch(
        `${API_URL}/api/commission-enquiries/${enquiry.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session.token}` },
        },
      )

      const result = await response.json()
      if (!response.ok)
        throw new Error(result.message ?? 'Could not delete enquiry.')

      setEnquiries((current) =>
        current.filter((item) => item.id !== enquiry.id),
      )
      setMessage(result.message ?? 'Enquiry archived.')
    } catch (error) {
      setMessage(error.message ?? 'Could not delete enquiry.')
    } finally {
      setDeletingId(null)
    }
  }

  function handleSignOut() {
    try {
      sessionStorage.removeItem('kalavista-admin-session')
    } catch {
      // ignore
    }
    setSession(null)
    navigate('/admin/login', { replace: true })
  }

  function selectTab(tabId) {
    setActiveTab(tabId)
    setIsMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
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

      <nav className="admin-tabs" aria-label="Studio sections">
        <button
          className="admin-tabs__toggle"
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls="admin-tabs-list"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">☰</span>
          {adminTabs.find((tab) => tab.id === activeTab)?.label ?? 'Sections'}
        </button>

        <ul
          className="admin-tabs__list"
          data-open={isMenuOpen}
          id="admin-tabs-list"
        >
          {adminTabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <li key={tab.id}>
                <button
                  className={`admin-tabs__button ${
                    isActive ? 'admin-tabs__button--active' : ''
                  }`}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => selectTab(tab.id)}
                >
                  <span className="admin-tabs__number">{tab.number}</span>
                  {tab.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {message && (
        <p className="admin-form-message" role="status">
          {message}
        </p>
      )}

      {activeTab === 'publish' && (
        <AdminArtworkForm
          token={session.token}
          onArtworkCreated={(artwork) => {
            setMessage(`Artwork published: ${artwork.title}`)
            setArtworkRefreshKey((key) => key + 1)
          }}
        />
      )}

      {activeTab === 'manage' && (
        <AdminArtworkManager
          token={session.token}
          refreshKey={artworkRefreshKey}
        />
      )}
      {activeTab === 'categories' && (
        <AdminCategoryManager token={session.token} />
      )}

      {activeTab === 'orders' && <AdminOrders token={session.token} />}

      {activeTab === 'enquiries' && (
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

                    <div className="admin-enquiry-card__controls">
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

                      <button
                        className="admin-enquiry-delete-button"
                        type="button"
                        disabled={deletingId === enquiry.id}
                        onClick={() => deleteEnquiry(enquiry)}
                      >
                        {deletingId === enquiry.id ? 'Archiving…' : 'Delete'}
                      </button>
                    </div>
                  </div>

                  <p className="admin-enquiry-card__message">
                    {enquiry.message}
                  </p>

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

                  <AdminCommissionQuote
                    enquiry={enquiry}
                    token={session.token}
                  />
                  <AdminCommissionProgress
                    enquiry={enquiry}
                    token={session.token}
                    onProgressUpdated={(updatedEnquiry) => {
                      setEnquiries((current) =>
                        current.map((item) =>
                          item.id === updatedEnquiry.id
                            ? { ...item, ...updatedEnquiry }
                            : item,
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
      )}
    </section>
  )
}

export default AdminDashboardPage
