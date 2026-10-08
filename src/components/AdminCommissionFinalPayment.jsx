import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

function formatPrice(amountInPaise, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format((amountInPaise ?? 0) / 100)
}

function AdminCommissionFinalPayment({ enquiry, token }) {
  const [message, setMessage] = useState('')
  const [isRequesting, setIsRequesting] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState('')

  const payment = enquiry.payment

  if (!payment || payment.status !== 'ADVANCE_PAID') {
    return null
  }

  const finalAmount =
    payment.finalAmountInPaise ||
    payment.totalPriceInPaise - payment.advanceInPaise

  async function requestFinalPayment() {
    setIsRequesting(true)
    setMessage('')

    try {
      const response = await fetch(
        `${API_URL}/api/commission-payments/${encodeURIComponent(
          payment.reference,
        )}/request-final-payment`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message ?? 'Could not request final payment.')
      }

      setPaymentUrl(result.data.paymentUrl)
      setMessage(result.message)
    } catch (error) {
      setMessage(error.message ?? 'Could not request final payment.')
    } finally {
      setIsRequesting(false)
    }
  }

  async function copyPaymentLink() {
    try {
      await navigator.clipboard.writeText(paymentUrl)
      setMessage('Final payment link copied.')
    } catch {
      setMessage(`Copy manually: ${paymentUrl}`)
    }
  }

  return (
    <section className="admin-final-payment">
      <p>FINAL 40% PAYMENT</p>
      <h4>Remaining balance: {formatPrice(finalAmount, payment.currency)}</h4>

      <button
        type="button"
        disabled={isRequesting}
        onClick={requestFinalPayment}
      >
        {isRequesting
          ? 'Creating payment link…'
          : 'Request final payment & email client'}
      </button>

      {paymentUrl && (
        <button type="button" onClick={copyPaymentLink}>
          Copy final payment link
        </button>
      )}

      {message && <span role="status">{message}</span>}
    </section>
  )
}

export default AdminCommissionFinalPayment
