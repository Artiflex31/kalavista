import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import './CommissionPaymentPage.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

function formatPrice(amountInPaise, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountInPaise / 100)
}

function loadRazorpayCheckout() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true

    script.onload = () => resolve()

    script.onerror = () => {
      reject(new Error('Razorpay Checkout could not load. Please try again.'))
    }

    document.body.appendChild(script)
  })
}

function CommissionPaymentPage() {
  const { reference } = useParams()

  const [payment, setPayment] = useState(null)
  const [selectedPreference, setSelectedPreference] = useState('ADVANCE_60')
  const [pageStatus, setPageStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [isPaying, setIsPaying] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadPayment() {
      try {
        setPageStatus('loading')
        setMessage('')

        const response = await fetch(
          `${API_URL}/api/commission-payments/${encodeURIComponent(reference)}`,
          {
            signal: controller.signal,
          },
        )

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.message ?? 'Payment link could not load.')
        }

        setPayment(result.data)
        setSelectedPreference(result.data.paymentPreference ?? 'ADVANCE_60')
        setPageStatus('ready')
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setMessage(error.message ?? 'Payment link could not load.')
        setPageStatus('error')
      }
    }

    loadPayment()

    return () => controller.abort()
  }, [reference])

  const isAlreadyPaid =
    payment?.status === 'ADVANCE_PAID' || payment?.status === 'FULLY_PAID'

  const amountToPay = useMemo(() => {
    if (!payment) {
      return 0
    }

    return selectedPreference === 'FULL_PAYMENT'
      ? payment.totalPriceInPaise
      : payment.advanceInPaise
  }, [payment, selectedPreference])

  async function startPayment() {
    if (!payment) {
      return
    }

    setIsPaying(true)
    setMessage('')

    try {
      const response = await fetch(
        `${API_URL}/api/commission-payments/${encodeURIComponent(
          reference,
        )}/create-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentPreference: selectedPreference,
          }),
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message ?? 'Could not start payment.')
      }

      await loadRazorpayCheckout()

      const razorpay = new window.Razorpay({
        key: result.data.razorpayKeyId,
        amount: result.data.amountDueInPaise,
        currency: result.data.currency,
        name: 'KalaVista',
        description:
          selectedPreference === 'FULL_PAYMENT'
            ? 'Full commission payment'
            : '60% commission advance',
        order_id: result.data.razorpayOrderId,
        theme: {
          color: '#a84d3f',
        },
        handler: async (razorpayResponse) => {
          try {
            const verificationResponse = await fetch(
              `${API_URL}/api/commission-payments/${encodeURIComponent(
                reference,
              )}/verify-payment`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(razorpayResponse),
              },
            )

            const verificationResult = await verificationResponse.json()

            if (!verificationResponse.ok) {
              throw new Error(
                verificationResult.message ?? 'Payment could not be verified.',
              )
            }

            setPayment((currentPayment) => ({
              ...currentPayment,
              status: verificationResult.data.status,
              amountDueInPaise: verificationResult.data.amountDueInPaise,
            }))

            setPageStatus('success')
            setMessage(verificationResult.message)
          } catch (error) {
            setMessage(
              error.message ??
                'Payment completed, but verification needs attention.',
            )
          } finally {
            setIsPaying(false)
          }
        },
        modal: {
          ondismiss() {
            setIsPaying(false)
          },
        },
      })

      razorpay.open()
    } catch (error) {
      setMessage(error.message ?? 'Could not start payment.')
      setIsPaying(false)
    }
  }

  if (pageStatus === 'loading') {
    return (
      <section className="commission-payment-page">
        <p className="commission-payment-page__state">
          Preparing your commission payment…
        </p>
      </section>
    )
  }

  if (pageStatus === 'error' || !payment) {
    return (
      <section className="commission-payment-page">
        <div className="commission-payment-page__panel">
          <p className="commission-payment-page__eyebrow">KALAVISTA</p>
          <h1>This payment link is unavailable.</h1>
          <p>{message}</p>

          <Link className="commission-payment-page__back-link" to="/">
            Return home
          </Link>
        </div>
      </section>
    )
  }

  if (isAlreadyPaid || pageStatus === 'success') {
    const isFullPayment = payment.status === 'FULLY_PAID'

    return (
      <section className="commission-payment-page">
        <div className="commission-payment-page__panel commission-payment-page__panel--success">
          <p className="commission-payment-page__eyebrow">PAYMENT RECEIVED</p>

          <div className="commission-payment-page__success-mark">✓</div>

          <h1>
            {isFullPayment
              ? 'Your commission is fully paid.'
              : 'Your 60% advance is received.'}
          </h1>

          <p>
            {message ||
              'Thank you. The artist will begin preparing your commission.'}
          </p>

          <Link className="commission-payment-page__back-link" to="/">
            Return to KalaVista
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="commission-payment-page">
      <div className="commission-payment-page__panel">
        <p className="commission-payment-page__eyebrow">
          KALAVISTA / COMMISSION
        </p>

        <h1>Choose how you would like to begin.</h1>

        <p className="commission-payment-page__intro">
          Your commission quote has been prepared. You may reserve your slot
          with a 60% advance, or pay the full amount now.
        </p>

        <div className="commission-payment-page__quote">
          <span>Final commission quote</span>

          <strong>
            {formatPrice(payment.totalPriceInPaise, payment.currency)}
          </strong>

          <p>{payment.artworkType}</p>
        </div>

        <div
          className="commission-payment-page__choices"
          role="radiogroup"
          aria-label="Choose a commission payment amount"
        >
          <button
            className={`commission-payment-choice ${
              selectedPreference === 'ADVANCE_60'
                ? 'commission-payment-choice--selected'
                : ''
            }`}
            type="button"
            role="radio"
            aria-checked={selectedPreference === 'ADVANCE_60'}
            onClick={() => setSelectedPreference('ADVANCE_60')}
          >
            <span className="commission-payment-choice__number">60%</span>

            <span className="commission-payment-choice__copy">
              <strong>Pay the advance</strong>
              <small>Reserve your commission and begin the process.</small>
            </span>

            <span className="commission-payment-choice__amount">
              {formatPrice(payment.advanceInPaise, payment.currency)}
            </span>
          </button>

          <button
            className={`commission-payment-choice ${
              selectedPreference === 'FULL_PAYMENT'
                ? 'commission-payment-choice--selected'
                : ''
            }`}
            type="button"
            role="radio"
            aria-checked={selectedPreference === 'FULL_PAYMENT'}
            onClick={() => setSelectedPreference('FULL_PAYMENT')}
          >
            <span className="commission-payment-choice__number">100%</span>

            <span className="commission-payment-choice__copy">
              <strong>Pay in full</strong>
              <small>Complete the commission payment today.</small>
            </span>

            <span className="commission-payment-choice__amount">
              {formatPrice(payment.totalPriceInPaise, payment.currency)}
            </span>
          </button>
        </div>

        <button
          className="commission-payment-page__pay-button"
          type="button"
          disabled={isPaying}
          onClick={startPayment}
        >
          {isPaying
            ? 'Opening secure checkout…'
            : `Pay ${formatPrice(amountToPay, payment.currency)} securely`}
        </button>

        {message && (
          <p className="commission-payment-page__message" role="status">
            {message}
          </p>
        )}

        <p className="commission-payment-page__note">
          Payments are securely processed by Razorpay. The remaining balance
          after a 60% advance is settled when the artwork is complete.
        </p>
      </div>
    </section>
  )
}

export default CommissionPaymentPage
