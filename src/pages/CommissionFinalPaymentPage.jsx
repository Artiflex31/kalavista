import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import './CommissionPaymentPage.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

function formatPrice(amountInPaise, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format((amountInPaise ?? 0) / 100)
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
    script.onload = resolve
    script.onerror = () =>
      reject(new Error('Razorpay Checkout could not load. Please try again.'))

    document.body.appendChild(script)
  })
}

function CommissionFinalPaymentPage() {
  const { reference } = useParams()
  const [payment, setPayment] = useState(null)
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [isPaying, setIsPaying] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadPayment() {
      try {
        const response = await fetch(
          `${API_URL}/api/commission-payments/${encodeURIComponent(reference)}`,
          { signal: controller.signal },
        )

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.message ?? 'Payment link could not load.')
        }

        setPayment(result.data)
        setStatus('ready')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setMessage(error.message ?? 'Payment link could not load.')
          setStatus('error')
        }
      }
    }

    loadPayment()
    return () => controller.abort()
  }, [reference])

  async function payFinalBalance() {
    setIsPaying(true)
    setMessage('')

    try {
      const response = await fetch(
        `${API_URL}/api/commission-payments/${encodeURIComponent(
          reference,
        )}/create-final-order`,
        {
          method: 'POST',
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message ?? 'Could not start final payment.')
      }

      await loadRazorpayCheckout()

      const razorpay = new window.Razorpay({
        key: result.data.razorpayKeyId,
        amount: result.data.amountInPaise,
        currency: result.data.currency,
        name: 'KalaVista',
        description: 'Final 40% commission payment',
        order_id: result.data.razorpayOrderId,
        theme: {
          color: '#a84d3f',
        },
        handler: async (razorpayResponse) => {
          try {
            const verificationResponse = await fetch(
              `${API_URL}/api/commission-payments/${encodeURIComponent(
                reference,
              )}/verify-final-payment`,
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
                verificationResult.message ??
                  'Final payment could not be verified.',
              )
            }

            setPayment((currentPayment) => ({
              ...currentPayment,
              status: verificationResult.data.status,
              finalPaymentStatus: verificationResult.data.finalPaymentStatus,
            }))

            setStatus('success')
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
      setMessage(error.message ?? 'Could not start final payment.')
      setIsPaying(false)
    }
  }

  if (status === 'loading') {
    return (
      <section className="commission-payment-page">
        <p className="commission-payment-page__state">
          Preparing final payment…
        </p>
      </section>
    )
  }

  if (status === 'error' || !payment) {
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

  if (
    payment.status === 'FULLY_PAID' ||
    payment.finalPaymentStatus === 'PAID' ||
    status === 'success'
  ) {
    return (
      <section className="commission-payment-page">
        <div className="commission-payment-page__panel commission-payment-page__panel--success">
          <p className="commission-payment-page__eyebrow">PAYMENT RECEIVED</p>
          <div className="commission-payment-page__success-mark">✓</div>
          <h1>Your commission is fully paid.</h1>
          <p>
            {message || 'Thank you for completing your KalaVista commission.'}
          </p>
          <Link className="commission-payment-page__back-link" to="/">
            Return to KalaVista
          </Link>
        </div>
      </section>
    )
  }

  if (payment.finalPaymentStatus !== 'AWAITING_PAYMENT') {
    return (
      <section className="commission-payment-page">
        <div className="commission-payment-page__panel">
          <p className="commission-payment-page__eyebrow">KALAVISTA</p>
          <h1>The final balance is not ready yet.</h1>
          <p>
            The artist will email you this secure link when the commission is
            complete.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="commission-payment-page">
      <div className="commission-payment-page__panel">
        <p className="commission-payment-page__eyebrow">
          KALAVISTA / FINAL PAYMENT
        </p>

        <h1>Your artwork is ready.</h1>

        <p className="commission-payment-page__intro">
          Complete the remaining 40% payment to finish your commission journey.
        </p>

        <div className="commission-payment-page__quote">
          <span>Remaining balance</span>
          <strong>
            {formatPrice(payment.finalAmountInPaise, payment.currency)}
          </strong>
          <p>{payment.artworkType}</p>
        </div>

        <button
          className="commission-payment-page__pay-button"
          type="button"
          disabled={isPaying}
          onClick={payFinalBalance}
        >
          {isPaying
            ? 'Opening secure checkout…'
            : `Pay ${formatPrice(
                payment.finalAmountInPaise,
                payment.currency,
              )} securely`}
        </button>

        {message && (
          <p className="commission-payment-page__message" role="status">
            {message}
          </p>
        )}
      </div>
    </section>
  )
}

export default CommissionFinalPaymentPage
