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

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function getProgressCopy(progress) {
  const progressCopy = {
    PAYMENT_RECEIVED: {
      title: 'Your artwork order is confirmed.',
      description:
        'Payment has been received. Your artwork is now reserved for delivery.',
    },
    PREPARING: {
      title: 'Your artwork is being prepared.',
      description:
        'The artwork is being carefully prepared for its journey to you.',
    },
    PACKED: {
      title: 'Your artwork has been packed.',
      description:
        'Your artwork is safely packed and ready to be handed to the courier.',
    },
    SHIPPED: {
      title: 'Your artwork is on its way.',
      description:
        'Your artwork has been shipped. Courier information is included below.',
    },
    DELIVERED: {
      title: 'Your artwork has been delivered.',
      description:
        'We hope the artwork finds a meaningful place in your space.',
    },
  }

  return progressCopy[progress] ?? progressCopy.PAYMENT_RECEIVED
}

export async function sendArtworkOrderUpdateEmail({
  customerName,
  customerEmail,
  artworkTitle,
  progress,
  courierName,
  trackingNumber,
  trackingUrl,
}) {
  const resend = getResendClient()
  const sender = getSender()
  const copy = getProgressCopy(progress)

  const courierDetails =
    progress === 'SHIPPED' && (courierName || trackingNumber)
      ? `
        <div style="margin:22px 0;padding:18px;border-radius:14px;background:#f4efe7;">
          ${
            courierName
              ? `<p style="margin:0 0 8px;">Courier: <strong>${escapeHtml(courierName)}</strong></p>`
              : ''
          }
          ${
            trackingNumber
              ? `<p style="margin:0;">Tracking number: <strong>${escapeHtml(trackingNumber)}</strong></p>`
              : ''
          }
        </div>
      `
      : ''

  const { data, error } = await resend.emails.send({
    from: sender,
    to: [customerEmail],
    subject: `${copy.title} · KalaVista`,
    html: `
      <main style="margin:0;padding:32px 16px;background:#f4efe7;font-family:Arial,sans-serif;color:#2b2028;">
        <section style="max-width:600px;margin:0 auto;padding:38px;border-radius:22px;background:#fffdf9;">
          <p style="margin:0 0 24px;color:#a84d3f;font-size:12px;font-weight:700;letter-spacing:2px;">
            KALAVISTA STUDIO
          </p>

          <h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:34px;font-weight:500;">
            ${escapeHtml(copy.title)}
          </h1>

          <p style="font-size:16px;line-height:1.7;">
            Hello ${escapeHtml(customerName)},
          </p>

          <p style="font-size:16px;line-height:1.7;">
            ${escapeHtml(copy.description)}
          </p>

          <p style="font-size:16px;line-height:1.7;">
            Artwork: <strong>${escapeHtml(artworkTitle)}</strong>
          </p>

          ${courierDetails}

          <p style="margin:30px 0 0;">
            <a
              href="${trackingUrl}"
              style="display:inline-block;padding:14px 20px;border-radius:999px;background:#a84d3f;color:#fffdf9;font-size:14px;font-weight:700;text-decoration:none;"
            >
              Track your artwork order
            </a>
          </p>
        </section>
      </main>
    `,
    text: `Hello ${customerName},

${copy.title}

${copy.description}

Artwork: ${artworkTitle}
${courierName ? `Courier: ${courierName}` : ''}
${trackingNumber ? `Tracking number: ${trackingNumber}` : ''}

Track your order:
${trackingUrl}`,
  })

  if (error) {
    throw new Error(error.message ?? 'Could not send order update email.')
  }

  return data
}
