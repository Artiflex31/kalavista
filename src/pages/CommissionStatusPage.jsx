import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import './CommissionStatusPage.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

const journeyStages = [
  {
    value: 'REQUEST_RECEIVED',
    title: 'Request received',
    description: 'Your idea has reached the KalaVista studio.',
  },
  {
    value: 'QUOTE_READY',
    title: 'Quote ready',
    description: 'Your commission quote is ready for review.',
  },
  {
    value: 'ADVANCE_RECEIVED',
    title: 'Payment received',
    description: 'Your commission is confirmed and ready to begin.',
  },
  {
    value: 'IN_PROGRESS',
    title: 'Artwork in progress',
    description: 'Your artwork is being created with care.',
  },
  {
    value: 'PREVIEW_READY',
    title: 'Preview ready',
    description: 'A preview is ready for your feedback.',
  },
  {
    value: 'COMPLETED',
    title: 'Completed',
    description: 'Your commission is complete.',
  },
]

function formatPrice(amountInPaise, currency = 'INR') {
  if (typeof amountInPaise !== 'number') {
    return '—'
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountInPaise / 100)
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(new Date(dateValue))
}

function getPaymentSummary(payment) {
  if (!payment) {
    return null
  }

  if (payment.status === 'FULLY_PAID') {
    return {
      title: 'Full payment received',
      description: 'Your commission payment is complete.',
    }
  }

  if (payment.status === 'ADVANCE_PAID') {
    return {
      title: '60% advance received',
      description:
        'The remaining amount is settled after the artwork is complete.',
    }
  }

  return {
    title: 'Payment awaiting',
    description: 'Your quote is ready. Choose 60% advance or full payment.',
  }
}

function CommissionStatusPage() {
  const { trackingReference } = useParams()

  const [tracking, setTracking] = useState(null)
  const [pageStatus, setPageStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadTracking() {
      try {
        setPageStatus('loading')
        setMessage('')

        const response = await fetch(
          `${API_URL}/api/commission-tracking/${encodeURIComponent(
            trackingReference,
          )}`,
          {
            signal: controller.signal,
          },
        )

        const result = await response.json()

        if (!response.ok) {
          throw new Error(
            result.message ?? 'Commission tracker could not load.',
          )
        }

        setTracking(result.data)
        setPageStatus('ready')
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setMessage(error.message ?? 'Commission tracker could not load.')
        setPageStatus('error')
      }
    }

    loadTracking()

    return () => controller.abort()
  }, [trackingReference])

  const activeStageIndex = useMemo(() => {
    if (!tracking) {
      return 0
    }

    return Math.max(
      0,
      journeyStages.findIndex((stage) => stage.value === tracking.progress),
    )
  }, [tracking])

  if (pageStatus === 'loading') {
    return (
      <section className="commission-tracker">
        <p className="commission-tracker__state">
          Opening your commission journey…
        </p>
      </section>
    )
  }

  if (pageStatus === 'error' || !tracking) {
    return (
      <section className="commission-tracker">
        <div className="commission-tracker__panel">
          <p className="commission-tracker__eyebrow">KALAVISTA</p>
          <h1>This tracker is unavailable.</h1>
          <p>{message}</p>

          <Link className="commission-tracker__back-link" to="/">
            Return home
          </Link>
        </div>
      </section>
    )
  }

  const paymentSummary = getPaymentSummary(tracking.payment)

  if (tracking.progress === 'CANCELLED') {
    return (
      <section className="commission-tracker">
        <div className="commission-tracker__panel">
          <p className="commission-tracker__eyebrow">COMMISSION TRACKER</p>
          <h1>This commission is no longer active.</h1>
          <p>
            Please contact the KalaVista studio if you have a question about
            your request.
          </p>

          <Link className="commission-tracker__back-link" to="/">
            Return to KalaVista
          </Link>
        </div>
      </section>
    )
  }

  const canPay =
    tracking.payment &&
    ['NOT_REQUESTED', 'AWAITING_ADVANCE'].includes(tracking.payment.status)

  return (
    <section className="commission-tracker">
      <div className="commission-tracker__panel">
        <header className="commission-tracker__header">
          <div>
            <p className="commission-tracker__eyebrow">
              KALAVISTA / YOUR COMMISSION
            </p>

            <h1>Your artwork journey.</h1>

            <p>
              {tracking.artworkType} · Submitted{' '}
              {formatDate(tracking.createdAt)}
            </p>
          </div>

          <span className="commission-tracker__reference">
            Ref. {tracking.trackingReference.slice(-8).toUpperCase()}
          </span>
        </header>

        {paymentSummary && (
          <section className="commission-tracker__payment">
            <div>
              <p>PAYMENT STATUS</p>
              <h2>{paymentSummary.title}</h2>
              <span>{paymentSummary.description}</span>
            </div>

            <div className="commission-tracker__payment-amounts">
              <span>Final quote</span>
              <strong>
                {formatPrice(
                  tracking.payment.totalPriceInPaise,
                  tracking.payment.currency,
                )}
              </strong>

              {tracking.payment.status === 'ADVANCE_PAID' && (
                <small>
                  Remaining:{' '}
                  {formatPrice(
                    tracking.payment.totalPriceInPaise -
                      tracking.payment.advanceInPaise,
                    tracking.payment.currency,
                  )}
                </small>
              )}
            </div>

            {canPay && (
              <Link
                className="commission-tracker__pay-link"
                to={`/commission-payment/${tracking.payment.reference}`}
              >
                Review payment options <span aria-hidden="true">↗</span>
              </Link>
            )}
          </section>
        )}

        <section
          className="commission-tracker__timeline"
          aria-label="Commission progress"
        >
          {journeyStages.map((stage, index) => {
            const isComplete = index < activeStageIndex
            const isCurrent = index === activeStageIndex

            return (
              <article
                className={`commission-tracker__stage ${
                  isComplete ? 'commission-tracker__stage--complete' : ''
                } ${isCurrent ? 'commission-tracker__stage--current' : ''}`}
                key={stage.value}
              >
                <div className="commission-tracker__marker">
                  {isComplete ? '✓' : String(index + 1).padStart(2, '0')}
                </div>

                <div>
                  <h2>{stage.title}</h2>
                  <p>{stage.description}</p>
                </div>
              </article>
            )
          })}
        </section>

        <footer className="commission-tracker__footer">
          <p>
            Last updated {formatDate(tracking.updatedAt)}. Keep this link
            private—it is your personal commission tracker.
          </p>

          <Link className="commission-tracker__back-link" to="/">
            Return to KalaVista
          </Link>
        </footer>
      </div>
    </section>
  )
}

export default CommissionStatusPage
