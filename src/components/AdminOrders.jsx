import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

const deliveryProgressOptions = [
  { value: 'PAYMENT_RECEIVED', label: 'Payment received' },
  { value: 'PREPARING', label: 'Preparing artwork' },
  { value: 'PACKED', label: 'Packed safely' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
]

function formatPrice(amountInPaise, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format((amountInPaise ?? 0) / 100)
}

function formatStatus(status) {
  return status
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatOrderDate(dateValue) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateValue))
}

function AdminOrders({ token }) {
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [updatingReference, setUpdatingReference] = useState(null)
  const [drafts, setDrafts] = useState({})

  useEffect(() => {
    const controller = new AbortController()

    async function loadOrders() {
      try {
        setStatus('loading')
        setMessage('')

        const response = await fetch(`${API_URL}/api/orders/admin`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.message ?? 'Could not load orders.')
        }

        setOrders(result.data ?? [])
        setStatus('ready')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setMessage(error.message ?? 'Could not load orders.')
          setStatus('error')
        }
      }
    }

    loadOrders()

    return () => controller.abort()
  }, [token])

  function getDraft(order) {
    return (
      drafts[order.reference] ?? {
        progress: order.deliveryProgress ?? 'PAYMENT_RECEIVED',
        courierName: order.courierName ?? '',
        trackingNumber: order.trackingNumber ?? '',
      }
    )
  }

  function updateDraft(reference, field, value) {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [reference]: {
        ...currentDrafts[reference],
        [field]: value,
      },
    }))
  }

  async function saveDeliveryUpdate(order) {
    const draft = getDraft(order)

    setUpdatingReference(order.reference)
    setMessage('')

    try {
      const response = await fetch(
        `${API_URL}/api/orders/admin/${encodeURIComponent(
          order.reference,
        )}/delivery-progress`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(draft),
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message ?? 'Could not update delivery progress.')
      }

      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.reference === order.reference
            ? result.data
            : currentOrder,
        ),
      )

      setDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts }
        delete nextDrafts[order.reference]
        return nextDrafts
      })

      setMessage(result.message)
    } catch (error) {
      setMessage(error.message ?? 'Could not update delivery progress.')
    } finally {
      setUpdatingReference(null)
    }
  }

  async function copyTrackingLink(reference) {
    const trackingUrl = `${window.location.origin}/order-status/${reference}`

    try {
      await navigator.clipboard.writeText(trackingUrl)
      setMessage('Buyer tracking link copied.')
    } catch {
      setMessage(`Copy this link manually: ${trackingUrl}`)
    }
  }

  return (
    <section className="admin-orders" aria-labelledby="admin-orders-title">
      <div className="admin-orders__heading">
        <div>
          <p className="admin-eyebrow">SALES DESK</p>
          <h2 id="admin-orders-title">Artwork orders</h2>
        </div>

        <span>{orders.length} total</span>
      </div>

      {message && (
        <p className="admin-form-message" role="status">
          {message}
        </p>
      )}

      {status === 'loading' && (
        <p className="admin-empty-copy">Loading artwork orders…</p>
      )}

      {status === 'error' && (
        <p className="admin-empty-copy">
          Orders could not load. Check that the API is running.
        </p>
      )}

      {status === 'ready' && orders.length === 0 && (
        <p className="admin-empty-copy">
          No artwork purchases yet. Paid orders will appear here.
        </p>
      )}

      {status === 'ready' && orders.length > 0 && (
        <div className="admin-orders__list">
          {orders.map((order) => {
            const draft = getDraft(order)
            const canUpdate =
              order.status === 'PAID' || order.status === 'FULFILLED'

            return (
              <article className="admin-order-card" key={order.reference}>
                <div className="admin-order-card__top">
                  <div>
                    <p className="admin-order-card__reference">
                      Order #{order.reference}
                    </p>

                    <h3>{order.artwork?.title ?? 'Artwork removed'}</h3>

                    <p className="admin-order-card__amount">
                      {formatPrice(order.amountInPaise, order.currency)}
                    </p>
                  </div>

                  <span
                    className={`admin-order-status admin-order-status--${order.status.toLowerCase()}`}
                  >
                    {formatStatus(order.status)}
                  </span>
                </div>

                <div className="admin-order-card__grid">
                  <div>
                    <span>Collector</span>
                    <strong>{order.customerName}</strong>
                    <a href={`mailto:${order.customerEmail}`}>
                      {order.customerEmail}
                    </a>
                  </div>

                  <div>
                    <span>Delivery address</span>
                    <p>
                      {order.shippingAddress}
                      <br />
                      {order.city}, {order.state} — {order.postalCode}
                    </p>
                  </div>

                  <div>
                    <span>Received</span>
                    <p>{formatOrderDate(order.createdAt)}</p>
                  </div>
                </div>

                {canUpdate && (
                  <div className="admin-order-delivery">
                    <div className="admin-order-delivery__heading">
                      <div>
                        <span>Buyer-visible delivery progress</span>
                        <strong>{formatStatus(order.deliveryProgress)}</strong>
                      </div>

                      <button
                        className="admin-order-copy-link"
                        type="button"
                        onClick={() => copyTrackingLink(order.reference)}
                      >
                        Copy tracking link
                      </button>
                    </div>

                    <div className="admin-order-delivery__fields">
                      <label>
                        <span>Progress</span>
                        <select
                          value={draft.progress}
                          onChange={(event) =>
                            updateDraft(
                              order.reference,
                              'progress',
                              event.target.value,
                            )
                          }
                        >
                          {deliveryProgressOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span>Courier</span>
                        <input
                          value={draft.courierName}
                          onChange={(event) =>
                            updateDraft(
                              order.reference,
                              'courierName',
                              event.target.value,
                            )
                          }
                          placeholder="e.g. Blue Dart"
                        />
                      </label>

                      <label>
                        <span>Tracking number</span>
                        <input
                          value={draft.trackingNumber}
                          onChange={(event) =>
                            updateDraft(
                              order.reference,
                              'trackingNumber',
                              event.target.value,
                            )
                          }
                          placeholder="e.g. AWB123456"
                        />
                      </label>
                    </div>

                    <button
                      className="admin-order-card__fulfil-button"
                      type="button"
                      disabled={updatingReference === order.reference}
                      onClick={() => saveDeliveryUpdate(order)}
                    >
                      {updatingReference === order.reference
                        ? 'Saving…'
                        : 'Save update & email buyer'}
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default AdminOrders
