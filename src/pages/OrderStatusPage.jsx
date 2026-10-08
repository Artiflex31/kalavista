import { Link, useParams } from 'react-router'
import { useEffect, useState } from 'react'
import './OrderStatusPage.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

const progressSteps = [
  {
    value: 'PAYMENT_RECEIVED',
    label: 'Payment received',
    description: 'Your artwork is reserved for delivery.',
  },
  {
    value: 'PREPARING',
    label: 'Preparing artwork',
    description: 'The artwork is being carefully prepared.',
  },
  {
    value: 'PACKED',
    label: 'Packed safely',
    description: 'Your artwork is packed for its journey.',
  },
  {
    value: 'SHIPPED',
    label: 'Shipped',
    description: 'Your artwork is on its way to you.',
  },
  {
    value: 'DELIVERED',
    label: 'Delivered',
    description: 'Your artwork has reached its new home.',
  },
]

function formatDate(dateValue) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateValue))
}

function OrderStatusPage() {
  const { reference } = useParams()

  const [order, setOrder] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadOrderTracking() {
      try {
        setStatus('loading')

        const response = await fetch(
          `${API_URL}/api/orders/${encodeURIComponent(reference)}/tracking`,
          { signal: controller.signal },
        )

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.message ?? 'Could not load order tracking.')
        }

        setOrder(result.data)
        setStatus('ready')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setErrorMessage(error.message ?? 'Could not load order tracking.')
          setStatus('error')
        }
      }
    }

    loadOrderTracking()

    return () => controller.abort()
  }, [reference])

  if (status === 'loading') {
    return (
      <section className="order-status-page">
        <p className="order-status-page__message">Loading order journey…</p>
      </section>
    )
  }

  if (status === 'error' || !order) {
    return (
      <section className="order-status-page">
        <div className="order-status-card">
          <p className="order-status-page__eyebrow">KALAVISTA DELIVERY</p>
          <h1>Order link not found.</h1>
          <p>
            {errorMessage || 'Please check the tracking link and try again.'}
          </p>
          <Link className="order-status-page__link" to="/gallery">
            Return to gallery
          </Link>
        </div>
      </section>
    )
  }

  const activeIndex = progressSteps.findIndex(
    (step) => step.value === order.deliveryProgress,
  )

  return (
    <section className="order-status-page" aria-labelledby="order-status-title">
      <div className="order-status-card">
        <p className="order-status-page__eyebrow">KALAVISTA DELIVERY</p>

        <h1 id="order-status-title">Your artwork’s journey.</h1>

        <div className="order-status-artwork">
          {order.artwork?.imageUrl && (
            <img src={order.artwork.imageUrl} alt={order.artwork.alt ?? ''} />
          )}

          <div>
            <p>Artwork order</p>
            <h2>{order.artwork?.title ?? 'Your KalaVista artwork'}</h2>
            <span>Order reference: {order.reference}</span>
          </div>
        </div>

        <ol className="order-status-timeline">
          {progressSteps.map((step, index) => {
            const isComplete = index <= activeIndex
            const isCurrent = index === activeIndex

            return (
              <li
                className={`order-status-timeline__item ${
                  isComplete ? 'order-status-timeline__item--complete' : ''
                } ${isCurrent ? 'order-status-timeline__item--current' : ''}`}
                key={step.value}
              >
                <span
                  className="order-status-timeline__dot"
                  aria-hidden="true"
                />
                <div>
                  <strong>{step.label}</strong>
                  <p>{step.description}</p>
                </div>
              </li>
            )
          })}
        </ol>

        {order.deliveryProgress === 'SHIPPED' && (
          <div className="order-status-shipping">
            <p>Courier details</p>
            {order.courierName && <strong>{order.courierName}</strong>}
            {order.trackingNumber && (
              <span>Tracking number: {order.trackingNumber}</span>
            )}
          </div>
        )}

        <p className="order-status-page__updated">
          Last updated: {formatDate(order.updatedAt)}
        </p>
      </div>
    </section>
  )
}

export default OrderStatusPage
