import crypto from 'node:crypto'
import prisma from '../lib/prisma.js'
import { sendCommissionPaymentConfirmationEmail } from '../lib/email.js'
import { sendArtworkOrderUpdateEmail } from '../lib/order-email.js'

function getClientUrl() {
  return (process.env.CLIENT_URL ?? 'http://localhost:5173').replace(/\/$/, '')
}

function isValidWebhookSignature(rawBody, receivedSignature) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET

  if (!webhookSecret) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET is missing from server/.env.')
  }

  if (!receivedSignature) {
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex')

  return (
    expectedSignature.length === receivedSignature.length &&
    crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(receivedSignature),
    )
  )
}

/*
  Razorpay sends payment events directly to this endpoint.

  Important:
  - req.body must remain a raw Buffer here.
  - Never use express.json() before this route.
  - This route is idempotent: duplicate webhook events do not duplicate payments.
*/
export async function handleRazorpayWebhook(req, res) {
  try {
    const rawBody = req.body
    const receivedSignature = req.get('x-razorpay-signature')

    if (!Buffer.isBuffer(rawBody)) {
      return res.status(400).json({
        success: false,
        message: 'Webhook body must be raw.',
      })
    }

    if (!isValidWebhookSignature(rawBody, receivedSignature)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Razorpay webhook signature.',
      })
    }

    const event = JSON.parse(rawBody.toString('utf8'))

    // We only need successfully captured payments for now.
    if (event.event !== 'payment.captured') {
      return res.status(200).json({
        success: true,
        message: `Event "${event.event}" safely ignored.`,
      })
    }

    const razorpayPayment = event.payload?.payment?.entity

    if (!razorpayPayment?.order_id || !razorpayPayment?.id) {
      return res.status(400).json({
        success: false,
        message: 'Razorpay payment event is incomplete.',
      })
    }

    const amountInPaise = Number(razorpayPayment.amount)
    const currency = String(razorpayPayment.currency ?? '').toUpperCase()

    /*
      1. Existing artwork purchase payment
    */
    const artworkOrder = await prisma.artworkOrder.findUnique({
      where: {
        razorpayOrderId: razorpayPayment.order_id,
      },
      include: {
        artwork: {
          select: {
            title: true,
          },
        },
      },
    })

    if (artworkOrder) {
      if (
        artworkOrder.status === 'PAID' ||
        artworkOrder.status === 'FULFILLED'
      ) {
        return res.status(200).json({
          success: true,
          message: 'Artwork-order payment was already processed.',
        })
      }

      if (
        artworkOrder.status !== 'PENDING_PAYMENT' ||
        artworkOrder.amountInPaise !== amountInPaise ||
        artworkOrder.currency.toUpperCase() !== currency
      ) {
        return res.status(400).json({
          success: false,
          message: 'Artwork-order payment details do not match.',
        })
      }

      const paidOrder = await prisma.$transaction(async (transaction) => {
        const updatedOrder = await transaction.artworkOrder.update({
          where: {
            id: artworkOrder.id,
          },
          data: {
            status: 'PAID',
            deliveryProgress: 'PAYMENT_RECEIVED',
            razorpayPaymentId: razorpayPayment.id,
          },
          include: {
            artwork: {
              select: {
                title: true,
              },
            },
          },
        })

        await transaction.artwork.update({
          where: {
            id: artworkOrder.artworkId,
          },
          data: {
            availability: 'SOLD',
          },
        })

        return updatedOrder
      })

      const trackingUrl = `${getClientUrl()}/order-status/${paidOrder.reference}`

      // Email failure must never undo a confirmed Razorpay payment.
      void sendArtworkOrderUpdateEmail({
        customerName: paidOrder.customerName,
        customerEmail: paidOrder.customerEmail,
        artworkTitle: paidOrder.artwork.title,
        progress: 'PAYMENT_RECEIVED',
        trackingUrl,
      }).catch((emailError) => {
        console.error(
          'Artwork-order webhook email could not be sent:',
          emailError,
        )
      })

      return res.status(200).json({
        success: true,
        message: 'Artwork-order payment processed through webhook.',
      })
    }

    /*
      2. Custom commission payment
    */
    const commissionPayment = await prisma.commissionPayment.findUnique({
      where: {
        razorpayOrderId: razorpayPayment.order_id,
      },
      include: {
        enquiry: true,
      },
    })

    if (commissionPayment) {
      if (
        commissionPayment.status === 'ADVANCE_PAID' ||
        commissionPayment.status === 'FULLY_PAID'
      ) {
        return res.status(200).json({
          success: true,
          message: 'Commission payment was already processed.',
        })
      }

      if (
        commissionPayment.status !== 'AWAITING_ADVANCE' ||
        commissionPayment.amountDueInPaise !== amountInPaise ||
        commissionPayment.currency.toUpperCase() !== currency
      ) {
        return res.status(400).json({
          success: false,
          message: 'Commission payment details do not match.',
        })
      }

      const completedStatus =
        commissionPayment.paymentPreference === 'FULL_PAYMENT'
          ? 'FULLY_PAID'
          : 'ADVANCE_PAID'

      const paidAmountInPaise = commissionPayment.amountDueInPaise

      const updatedPayment = await prisma.$transaction(async (transaction) => {
        const savedPayment = await transaction.commissionPayment.update({
          where: {
            id: commissionPayment.id,
          },
          data: {
            status: completedStatus,
            amountDueInPaise: 0,
            razorpayPaymentId: razorpayPayment.id,
          },
        })

        await transaction.commissionEnquiry.update({
          where: {
            id: commissionPayment.enquiryId,
          },
          data: {
            status: 'ACCEPTED',
            progress: 'ADVANCE_RECEIVED',
          },
        })

        return savedPayment
      })

      const trackingUrl = `${getClientUrl()}/commission-status/${commissionPayment.enquiry.trackingReference}`

      void sendCommissionPaymentConfirmationEmail({
        customerName: commissionPayment.enquiry.name,
        customerEmail: commissionPayment.enquiry.email,
        paymentPreference: commissionPayment.paymentPreference,
        paidAmountInPaise,
        currency: updatedPayment.currency,
        trackingUrl,
      }).catch((emailError) => {
        console.error('Commission webhook email could not be sent:', emailError)
      })

      return res.status(200).json({
        success: true,
        message: 'Commission payment processed through webhook.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'No KalaVista order matched this Razorpay payment.',
    })
  } catch (error) {
    console.error('Razorpay webhook error:', error)

    return res.status(500).json({
      success: false,
      message: 'Webhook processing failed.',
    })
  }
}
