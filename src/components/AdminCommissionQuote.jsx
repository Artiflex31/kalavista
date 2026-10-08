import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

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

function AdminCommissionQuote({ enquiry, token }) {
  const existingPayment = enquiry.payment ?? null

  const [quoteInRupees, setQuoteInRupees] = useState(
    existingPayment ? String(existingPayment.totalPriceInPaise / 100) : '',
  )

  const [payment, setPayment] = useState(existingPayment)
  const [status, setStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const isPaid =
    payment?.status === 'ADVANCE_PAID' || payment?.status === 'FULLY_PAID'

  const paymentLink = payment?.reference
    ? `${window.location.origin}/commission-payment/${payment.reference}`
    : ''

  async function createQuote(event) {
    event.preventDefault()
    setStatus('')

    const totalPriceInPaise = Math.round(Number(quoteInRupees) * 100)

    if (!Number.isInteger(totalPriceInPaise) || totalPriceInPaise < 100) {
      setStatus('Enter a valid price in rupees.')
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch(
        `${API_URL}/api/commission-enquiries/${enquiry.id}/quote`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            totalPriceInPaise,
            currency: 'INR',
          }),
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message ?? 'Could not create quote.')
      }

      setPayment({
        reference: result.data.paymentReference,
        totalPriceInPaise: result.data.totalPriceInPaise,
        advanceInPaise: result.data.advanceInPaise,
        amountDueInPaise: 0,
        currency: result.data.currency,
        status: result.data.paymentStatus,
      })

      setStatus(
        result.message ??
          'Quote saved. Copy the payment link and send it to the collector.',
      )
    } catch (error) {
      setStatus(error.message ?? 'Could not create quote.')
    } finally {
      setIsSaving(false)
    }
  }

  async function copyPaymentLink() {
    try {
      await navigator.clipboard.writeText(paymentLink)
      setStatus('Payment link copied.')
    } catch {
      setStatus('Could not copy automatically. Select and copy the link below.')
    }
  }

  return (
    <section className="admin-commission-quote">
      <div className="admin-commission-quote__heading">
        <div>
          <p>PAYMENT REQUEST</p>
          <h4>Set commission quote</h4>
        </div>

        {payment && (
          <span className="admin-commission-quote__status">
            {payment.status.replaceAll('_', ' ')}
          </span>
        )}
      </div>

      {isPaid ? (
        <p className="admin-commission-quote__paid-message">
          {payment.status === 'FULLY_PAID'
            ? 'The collector has paid the full commission amount.'
            : 'The 60% advance has been received. You can begin the artwork.'}
        </p>
      ) : (
        <form className="admin-commission-quote__form" onSubmit={createQuote}>
          <label>
            <span>Final quote in ₹</span>
            <input
              type="number"
              min="1"
              step="1"
              value={quoteInRupees}
              onChange={(event) => setQuoteInRupees(event.target.value)}
              placeholder="For example: 10000"
            />
          </label>

          <button type="submit" disabled={isSaving}>
            {isSaving
              ? 'Saving…'
              : payment
                ? 'Update quote'
                : 'Create payment link'}
          </button>
        </form>
      )}

      {payment && (
        <div className="admin-commission-quote__summary">
          <p>
            <strong>Full quote:</strong>{' '}
            {formatPrice(payment.totalPriceInPaise, payment.currency)}
          </p>

          <p>
            <strong>60% advance:</strong>{' '}
            {formatPrice(payment.advanceInPaise, payment.currency)}
          </p>

          {!isPaid && (
            <>
              <label>
                <span>Collector payment link</span>
                <input value={paymentLink} readOnly />
              </label>

              <button
                className="admin-commission-quote__copy-button"
                type="button"
                onClick={copyPaymentLink}
              >
                Copy payment link
              </button>
            </>
          )}
        </div>
      )}

      {status && (
        <p className="admin-commission-quote__message" role="status">
          {status}
        </p>
      )}
    </section>
  )
}

export default AdminCommissionQuote
