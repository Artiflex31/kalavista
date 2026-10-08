import { Resend } from 'resend'

function formatPrice(amountInPaise, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format((amountInPaise ?? 0) / 100)
}

function getResendClient() {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error('Resend email configuration is missing.')
  }

  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendFinalPaymentRequestEmail({
  customerName,
  customerEmail,
  finalAmountInPaise,
  currency,
  paymentUrl,
  trackingUrl,
}) {
  const amount = formatPrice(finalAmountInPaise, currency)
  const resend = getResendClient()

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: [customerEmail],
    subject: 'Your KalaVista commission is ready for its final payment',
    html: `
      <main style="padding:32px 16px;background:#f4efe7;font-family:Arial,sans-serif;color:#2b2028;">
        <section style="max-width:600px;margin:auto;padding:38px;border-radius:22px;background:#fffdf9;">
          <p style="color:#a84d3f;font-size:12px;font-weight:700;letter-spacing:2px;">KALAVISTA STUDIO</p>
          <h1 style="font-family:Georgia,serif;font-size:34px;font-weight:500;">Your artwork is ready.</h1>
          <p>Hello ${customerName},</p>
          <p>Your commission has reached its final stage. The remaining balance is <strong>${amount}</strong>.</p>
          <p>
            <a href="${paymentUrl}" style="display:inline-block;padding:14px 20px;border-radius:999px;background:#a84d3f;color:#fffdf9;font-weight:700;text-decoration:none;">
              Pay final balance securely
            </a>
          </p>
          <p style="font-size:14px;">Track your commission: <a href="${trackingUrl}">${trackingUrl}</a></p>
        </section>
      </main>
    `,
    text: `Hello ${customerName},

Your KalaVista commission is ready.

Remaining balance: ${amount}
Pay securely: ${paymentUrl}
Track your commission: ${trackingUrl}`,
  })

  if (error) {
    throw new Error(error.message ?? 'Could not send final-payment email.')
  }

  return data
}

export async function sendFinalPaymentConfirmationEmail({
  customerName,
  customerEmail,
  finalAmountInPaise,
  currency,
  trackingUrl,
}) {
  const amount = formatPrice(finalAmountInPaise, currency)
  const resend = getResendClient()

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: [customerEmail],
    subject: 'Your KalaVista commission is fully paid',
    html: `
      <main style="padding:32px 16px;background:#f4efe7;font-family:Arial,sans-serif;color:#2b2028;">
        <section style="max-width:600px;margin:auto;padding:38px;border-radius:22px;background:#fffdf9;">
          <p style="color:#a84d3f;font-size:12px;font-weight:700;letter-spacing:2px;">KALAVISTA STUDIO</p>
          <h1 style="font-family:Georgia,serif;font-size:34px;font-weight:500;">Commission fully paid.</h1>
          <p>Hello ${customerName},</p>
          <p>We have received your final payment of <strong>${amount}</strong>. Thank you for bringing this artwork to life with KalaVista.</p>
          <p>
            <a href="${trackingUrl}" style="display:inline-block;padding:14px 20px;border-radius:999px;background:#a84d3f;color:#fffdf9;font-weight:700;text-decoration:none;">
              View commission journey
            </a>
          </p>
        </section>
      </main>
    `,
    text: `Hello ${customerName},

Your final payment of ${amount} has been received.
Your KalaVista commission is now fully paid.

Track your commission:
${trackingUrl}`,
  })

  if (error) {
    throw new Error(
      error.message ?? 'Could not send final-payment confirmation.',
    )
  }

  return data
}
