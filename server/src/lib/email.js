import { getMailTransporter, getMailSender } from './mailer.js'

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
  const transporter = getMailTransporter()

  const info = await transporter.sendMail({
    from: getMailSender(),
    to,
    subject,
    html,
    text,
  })

  return { id: info.messageId }
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
/*
  Event 3: Sent when a commission is cancelled by the studio.
  Tells the client whether a refund is being processed or the advance
  is retained per policy.
*/
export async function sendCommissionCancellationEmail({
  customerName,
  customerEmail,
  artworkType,
  refundAmountInPaise,
  retainedAmountInPaise,
  totalPriceInPaise,
  currency,
  outcomeType, // 'no_payment' | 'full_refund' | 'partial_refund' | 'no_refund'
}) {
  const refundAmount = formatCurrency(refundAmountInPaise, currency)
  const retainedAmount = formatCurrency(retainedAmountInPaise, currency)
  const totalAmount = formatCurrency(totalPriceInPaise, currency)

  let bodyContent = ''
  let subject = 'Your KalaVista commission has been cancelled'

  if (outcomeType === 'no_payment') {
    bodyContent = `
        <p style="font-size:16px;line-height:1.7;">
          Your commission for <strong>${escapeHtml(artworkType)}</strong> has been
          cancelled. No payment had been recorded, so no refund is applicable.
        </p>

        <p style="font-size:16px;line-height:1.7;">
          If you have any questions, or would like to start a new commission,
          reply to this email and we will be happy to help.
        </p>
      `
  } else if (outcomeType === 'full_refund') {
    bodyContent = `
        <p style="font-size:16px;line-height:1.7;">
          Your commission for <strong>${escapeHtml(artworkType)}</strong> has been
          cancelled. Since work had not yet begun, we are processing a
          <strong>full refund of ${escapeHtml(refundAmount)}</strong>.
        </p>

        <p style="font-size:16px;line-height:1.7;">
          The refund will be credited to your original payment method within
          5-7 business days. You will receive a separate confirmation from the
          payment provider.
        </p>
      `
  } else if (outcomeType === 'partial_refund') {
    bodyContent = `
        <p style="font-size:16px;line-height:1.7;">
          Your commission for <strong>${escapeHtml(artworkType)}</strong> has been
          cancelled. The artwork had already entered production, so per our
          Refund Policy the 60% advance is retained.
        </p>

        <div style="margin:24px 0;padding:20px;border-radius:14px;background:#f4efe7;">
          <p style="margin:0 0 9px;">Total paid: <strong>${escapeHtml(totalAmount)}</strong></p>
          <p style="margin:0 0 9px;">Advance retained (60%): <strong>${escapeHtml(retainedAmount)}</strong></p>
          <p style="margin:0;">Refund to be processed (40%): <strong>${escapeHtml(refundAmount)}</strong></p>
        </div>

        <p style="font-size:16px;line-height:1.7;">
          The refund will be credited to your original payment method within
          5-7 business days. You will receive a separate confirmation from the
          payment provider.
        </p>
      `
  } else {
    // no_refund
    bodyContent = `
        <p style="font-size:16px;line-height:1.7;">
          Your commission for <strong>${escapeHtml(artworkType)}</strong> has been
          cancelled. Since the artwork had already entered production, the
          <strong>60% advance of ${escapeHtml(retainedAmount)}</strong> is retained
          per our Refund Policy. This covers the initial labour and materials
          already invested in your unique artwork.
        </p>

        <p style="font-size:16px;line-height:1.7;">
          If you believe this decision was made in error, or if you would like to
          discuss an alternative resolution, please reply to this email and we
          will work with you.
        </p>
      `
  }

  return sendEmail({
    to: customerEmail,
    subject,
    html: emailLayout({
      title: 'Your commission has been cancelled.',
      greeting: `Hello ${customerName},`,
      content: bodyContent,
    }),
    text: `Hello ${customerName},

Your KalaVista commission for ${artworkType} has been cancelled.

${
  outcomeType === 'no_payment'
    ? 'No payment had been recorded, so no refund is applicable.'
    : outcomeType === 'full_refund'
      ? `A full refund of ${refundAmount} is being processed. It will be credited to your original payment method within 5-7 business days.`
      : outcomeType === 'partial_refund'
        ? `Total paid: ${totalAmount}. Advance retained (60%): ${retainedAmount}. Refund to be processed (40%): ${refundAmount}. The refund will be credited within 5-7 business days.`
        : `The 60% advance of ${retainedAmount} is retained per our Refund Policy, as the artwork had already entered production.`
}

If you have any questions, reply to this email.`,
  })
}
