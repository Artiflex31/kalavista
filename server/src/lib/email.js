import { Resend } from 'resend'

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is missing from server/.env.')
  }

  return new Resend(process.env.RESEND_API_KEY)
}

function getSender() {
  if (!process.env.EMAIL_FROM) {
    throw new Error('EMAIL_FROM is missing from server/.env.')
  }

  return process.env.EMAIL_FROM
}

function formatCurrency(amountInPaise, currency = 'INR') {
  const amount = Number(amountInPaise ?? 0) / 100

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function emailLayout({ title, greeting, content, buttonLabel, buttonUrl }) {
  return `
    <main style="margin:0;padding:32px 16px;background:#f4efe7;font-family:Arial,sans-serif;color:#2b2028;">
      <section style="max-width:600px;margin:0 auto;padding:38px;border-radius:22px;background:#fffdf9;">
        <p style="margin:0 0 24px;color:#a84d3f;font-size:12px;font-weight:700;letter-spacing:2px;">
          KALAVISTA STUDIO
        </p>

        <h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:36px;font-weight:500;">
          ${escapeHtml(title)}
        </h1>

        <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">
          ${escapeHtml(greeting)}
        </p>

        ${content}

        ${
          buttonUrl
            ? `
              <p style="margin:30px 0 0;">
                <a
                  href="${buttonUrl}"
                  style="display:inline-block;padding:14px 20px;border-radius:999px;background:#a84d3f;color:#fffdf9;font-size:14px;font-weight:700;text-decoration:none;"
                >
                  ${escapeHtml(buttonLabel)}
                </a>
              </p>
            `
            : ''
        }

        <p style="margin:32px 0 0;color:#71656a;font-size:13px;line-height:1.6;">
          KalaVista · Original art and commissioned stories.
        </p>
      </section>
    </main>
  `
}

async function sendEmail({ to, subject, html, text }) {
  const resend = getResendClient()

  const { data, error } = await resend.emails.send({
    from: getSender(),
    to: [to],
    subject,
    html,
    text,
  })

  if (error) {
    throw new Error(error.message ?? 'Resend could not send the email.')
  }

  return data
}

/*
  Event 1: Sent when the artist creates or revises a commission quote.
*/
export async function sendCommissionQuoteEmail({
  customerName,
  customerEmail,
  artworkType,
  totalPriceInPaise,
  advanceInPaise,
  currency,
  paymentUrl,
  trackingUrl,
}) {
  const total = formatCurrency(totalPriceInPaise, currency)
  const advance = formatCurrency(advanceInPaise, currency)

  return sendEmail({
    to: customerEmail,
    subject: 'Your KalaVista commission quote is ready',
    html: emailLayout({
      title: 'Your commission quote is ready.',
      greeting: `Hello ${customerName},`,
      content: `
        <p style="font-size:16px;line-height:1.7;">
          Your quote for <strong>${escapeHtml(artworkType)}</strong> is ready.
        </p>

        <div style="margin:24px 0;padding:20px;border-radius:14px;background:#f4efe7;">
          <p style="margin:0 0 9px;">Final quote: <strong>${escapeHtml(total)}</strong></p>
          <p style="margin:0;">60% advance: <strong>${escapeHtml(advance)}</strong></p>
        </div>

        <p style="font-size:16px;line-height:1.7;">
          You can choose either the 60% advance or full payment on the secure payment page.
          Your commission journey can be followed anytime through the tracking link below.
        </p>

        <p style="font-size:14px;">
          Tracking link: <a href="${trackingUrl}">${trackingUrl}</a>
        </p>
      `,
      buttonLabel: 'View quote & pay securely',
      buttonUrl: paymentUrl,
    }),
    text: `Hello ${customerName},

Your KalaVista commission quote is ready.

Artwork type: ${artworkType}
Final quote: ${total}
60% advance: ${advance}

Pay securely: ${paymentUrl}
Track your commission: ${trackingUrl}`,
  })
}

/*
  Event 2: Sent only after Razorpay signature verification succeeds.
*/
export async function sendCommissionPaymentConfirmationEmail({
  customerName,
  customerEmail,
  paymentPreference,
  paidAmountInPaise,
  currency,
  trackingUrl,
}) {
  const paidAmount = formatCurrency(paidAmountInPaise, currency)
  const wasFullPayment = paymentPreference === 'FULL_PAYMENT'

  const paymentLabel = wasFullPayment
    ? 'Full payment received'
    : '60% advance received'

  return sendEmail({
    to: customerEmail,
    subject: `${paymentLabel} · KalaVista`,
    html: emailLayout({
      title: paymentLabel,
      greeting: `Hello ${customerName},`,
      content: `
        <p style="font-size:16px;line-height:1.7;">
          We have securely received your payment of
          <strong>${escapeHtml(paidAmount)}</strong>.
        </p>

        <p style="font-size:16px;line-height:1.7;">
          ${
            wasFullPayment
              ? 'Your commission is now confirmed. The artist will update its progress as the artwork takes shape.'
              : 'Your commission is now confirmed. The remaining 40% will be requested when the artwork is ready, in a later milestone.'
          }
        </p>

        <p style="font-size:14px;">
          Track your commission: <a href="${trackingUrl}">${trackingUrl}</a>
        </p>
      `,
      buttonLabel: 'Track commission progress',
      buttonUrl: trackingUrl,
    }),
    text: `Hello ${customerName},

${paymentLabel}: ${paidAmount}.

Track your commission progress:
${trackingUrl}`,
  })
}
