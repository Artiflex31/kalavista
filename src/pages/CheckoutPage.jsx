import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import './CheckoutPage.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

const initialForm = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  shippingAddress: '',
  city: '',
  state: '',
  postalCode: '',
}

function formatPrice(priceInPaise, currency = 'INR') {
  if (typeof priceInPaise !== 'number') {
    return 'Price on request'
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(priceInPaise / 100)
}

function loadRazorpayCheckout() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true

    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)

    document.body.appendChild(script)
  })
}

function CheckoutPage() {
  const { slug } = useParams()

  const [artwork, setArtwork] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderReference, setOrderReference] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadArtwork() {
      try {
        const response = await fetch(
          `${API_URL}/api/artworks/${encodeURIComponent(slug)}`,
          {
            signal: controller.signal,
          },
        )

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.message ?? 'Artwork could not load.')
        }

        setArtwork(result.data)
        setStatus('ready')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setMessage(error.message ?? 'Artwork could not load.')
          setStatus('error')
        }
      }
    }

    loadArtwork()

    return () => controller.abort()
  }, [slug])

  function updateField(event) {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  async function releaseReservation(reference) {
    try {
      await fetch(`${API_URL}/api/orders/${reference}/cancel`, {
        method: 'POST',
      })
    } catch {
      // The server will still show the pending order to the admin.
    }
  }

  async function openRazorpayCheckout(checkoutData) {
    const isRazorpayLoaded = await loadRazorpayCheckout()

    if (!isRazorpayLoaded) {
      await releaseReservation(checkoutData.reference)
      throw new Error('Razorpay Checkout could not load. Please try again.')
    }

    let paymentStarted = false

    const razorpay = new window.Razorpay({
      key: checkoutData.razorpayKeyId,
      amount: checkoutData.amountInPaise,
      currency: checkoutData.currency,
      name: 'KalaVista',
      description: artwork.title,
      image: checkoutData.artwork.imageUrl ?? undefined,
      order_id: checkoutData.razorpayOrderId,
      prefill: {
        name: form.customerName,
        email: form.customerEmail,
        contact: form.customerPhone,
      },
      notes: {
        kalavista_reference: checkoutData.reference,
        artwork: artwork.title,
      },
      theme: {
        color: '#9c4135',
      },
      handler: async (paymentResponse) => {
        paymentStarted = true

        try {
          const response = await fetch(
            `${API_URL}/api/orders/${checkoutData.reference}/verify-payment`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpayOrderId: paymentResponse.razorpay_order_id,
                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                razorpaySignature: paymentResponse.razorpay_signature,
              }),
            },
          )

          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.message ?? 'Payment verification failed.')
          }

          setOrderReference(result.data.reference)
          setStatus('success')
          setMessage(result.message)
        } catch (error) {
          setMessage(
            error.message ??
              'Payment was received, but verification needs attention. Please contact the artist with your payment details.',
          )
          setStatus('error')
        } finally {
          setIsSubmitting(false)
        }
      },
      modal: {
        ondismiss: () => {
          if (!paymentStarted) {
            releaseReservation(checkoutData.reference)
            setMessage('Checkout closed. The artwork is available again.')
            setIsSubmitting(false)
          }
        },
      },
    })

    razorpay.open()
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (artwork?.availability !== 'AVAILABLE') {
      setMessage('This artwork is no longer available to purchase.')
      return
    }

    setIsSubmitting(true)
    setMessage('')

    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          artworkSlug: slug,
          ...form,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message ?? 'Could not start checkout.')
      }

      await openRazorpayCheckout(result.data)
    } catch (error) {
      setMessage(error.message ?? 'Could not start checkout.')
      setIsSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <section className="checkout-page">
        <p className="checkout-page__loading">Preparing secure checkout…</p>
      </section>
    )
  }

  if (status === 'success') {
    return (
      <section className="checkout-page checkout-page--success">
        <div className="checkout-success">
          <p className="checkout-eyebrow">PAYMENT VERIFIED</p>
          <h1>Your artwork is reserved.</h1>
          <p>
            Thank you for supporting original art. We will contact you shortly
            regarding delivery.
          </p>
          <p className="checkout-success__reference">
            Order reference: <strong>{orderReference}</strong>
          </p>

          <Link className="checkout-button" to="/gallery">
            Return to the gallery
          </Link>
        </div>
      </section>
    )
  }

  if (status === 'error' && !artwork) {
    return (
      <section className="checkout-page checkout-page--success">
        <div className="checkout-success">
          <p className="checkout-eyebrow">CHECKOUT UNAVAILABLE</p>
          <h1>We could not prepare this artwork.</h1>
          <p>{message}</p>

          <Link className="checkout-button" to="/gallery">
            Return to the gallery
          </Link>
        </div>
      </section>
    )
  }

  const isAvailable = artwork.availability === 'AVAILABLE'

  return (
    <section className="checkout-page" aria-labelledby="checkout-title">
      <Link className="checkout-back-link" to={`/artworks/${slug}`}>
        ← Back to artwork
      </Link>

      <div className="checkout-layout">
        <aside className="checkout-summary">
          {artwork.imageUrl ? (
            <img src={artwork.imageUrl} alt={artwork.alt ?? artwork.title} />
          ) : (
            <div className="checkout-summary__fallback" aria-hidden="true">
              कला
            </div>
          )}

          <p className="checkout-eyebrow">YOUR SELECTED ARTWORK</p>
          <h1 id="checkout-title">{artwork.title}</h1>
          <p>{artwork.medium}</p>
          <strong>{formatPrice(artwork.priceInPaise, artwork.currency)}</strong>
        </aside>

        <div className="checkout-form-wrap">
          <p className="checkout-eyebrow">SECURE CHECKOUT</p>
          <h2>Where should your artwork travel?</h2>
          <p className="checkout-form-wrap__intro">
            Your shipping details are used only to process this artwork order.
          </p>

          {!isAvailable ? (
            <p className="checkout-unavailable">
              This artwork is no longer available to purchase.
            </p>
          ) : (
            <form className="checkout-form" onSubmit={handleSubmit}>
              <div className="checkout-form__grid">
                <label>
                  <span>Full name *</span>
                  <input
                    name="customerName"
                    value={form.customerName}
                    onChange={updateField}
                    required
                  />
                </label>

                <label>
                  <span>Email address *</span>
                  <input
                    name="customerEmail"
                    type="email"
                    value={form.customerEmail}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className="checkout-form__wide">
                  <span>Phone number</span>
                  <input
                    name="customerPhone"
                    type="tel"
                    value={form.customerPhone}
                    onChange={updateField}
                    placeholder="Optional"
                  />
                </label>

                <label className="checkout-form__wide">
                  <span>Shipping address *</span>
                  <textarea
                    name="shippingAddress"
                    value={form.shippingAddress}
                    onChange={updateField}
                    required
                  />
                </label>

                <label>
                  <span>City *</span>
                  <input
                    name="city"
                    value={form.city}
                    onChange={updateField}
                    required
                  />
                </label>

                <label>
                  <span>State *</span>
                  <input
                    name="state"
                    value={form.state}
                    onChange={updateField}
                    required
                  />
                </label>

                <label>
                  <span>Postal code *</span>
                  <input
                    name="postalCode"
                    value={form.postalCode}
                    onChange={updateField}
                    required
                  />
                </label>
              </div>

              <button
                className="checkout-button"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Preparing secure payment…'
                  : `Pay ${formatPrice(
                      artwork.priceInPaise,
                      artwork.currency,
                    )}`}
              </button>

              {message && (
                <p className="checkout-form__message" role="status">
                  {message}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  )
}

export default CheckoutPage
