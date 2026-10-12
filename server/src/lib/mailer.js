import nodemailer from 'nodemailer'

let cachedTransporter = null

export function getMailTransporter() {
  if (cachedTransporter) {
    return cachedTransporter
  }

  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) {
    throw new Error(
      'GMAIL_USER and GMAIL_APP_PASSWORD must be set in server/.env.',
    )
  }

  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })

  return cachedTransporter
}

export function getMailSender() {
  if (!process.env.EMAIL_FROM) {
    throw new Error('EMAIL_FROM is missing from server/.env.')
  }

  return process.env.EMAIL_FROM
}
