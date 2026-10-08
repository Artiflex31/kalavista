import crypto from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import razorpay from '../lib/razorpay.js'
import requireAdmin from '../middleware/requireAdmin.js'
import { sendArtworkOrderUpdateEmail } from '../lib/order-email.js'

const router = Router()

const checkoutSchema = z.object({
  artworkSlug: z.string().trim().min(1),
  customerName: z.string().trim().min(2).max(100),
  customerEmail: z.string().trim().email(),
  customerPhone: z.string().trim().min(8).max(30).optional().or(z.literal('')),
  shippingAddress: z.string().trim().min(10).max(500),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(4).max(20),
})

const paymentVerificationSchema = z.object({
  razorpayOrderId: z.string().trim().min(1),
  razorpayPaymentId: z.string().trim().min(1),
  razorpaySignature: z.string().trim().min(1),
})

const deliveryProgressSchema = z.object({
  progress: z.enum([
    'PAYMENT_RECEIVED',
    'PREPARING',
    'PACKED',
    'SHIPPED',
    'DELIVERED',
  ]),
  courierName: z.string().trim().max(100).optional().or(z.literal('')),
  trackingNumber: z.string().trim().max(100).optional().or(z.literal('')),
})

function getClientUrl() {
  return (process.env.CLIENT_URL ?? 'http://localhost:5173').replace(/\/$/, '')
}

/*
  Protected: Studio order inbox.
*/
router.get('/admin', requireAdmin, async (req, res, next) => {
  try {
    const orders = await prisma.artworkOrder.findMany({
      include: {
        artwork: {
          select: {
            id: true,
            slug: true,
            title: true,
            imageUrl: true,
            availability: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    })
  } catch (error) {
    next(error)
  }
})

/*
  Protected: update buyer-visible delivery progress.
*/
router.patch(
  '/admin/:reference/delivery-progress',
  requireAdmin,
  async (req, res, next) => {
    try {
      const parsedReference = z.string().min(1).safeParse(req.params.reference)
      const parsedBody = deliveryProgressSchema.safeParse(req.body)

      if (!parsedReference.success || !parsedBody.success) {
        return res.status(400).json({
          success: false,
          message: 'Please choose a valid delivery update.',
        })
      }

      const { progress, courierName, trackingNumber } = parsedBody.data

      if (
        progress === 'SHIPPED' &&
        (!courierName.trim() || !trackingNumber.trim())
      ) {
        return res.status(400).json({
          success: false,
          message: 'Add both courier name and tracking number before shipping.',
        })
      }

      const order = await prisma.artworkOrder.findUnique({
        where: {
          reference: parsedReference.data,
        },
        include: {
          artwork: {
            select: {
              title: true,
            },
          },
        },
      })

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found.',
        })
      }

      if (order.status !== 'PAID' && order.status !== 'FULFILLED') {
        return res.status(400).json({
          success: false,
          message: 'Only a paid order can receive delivery updates.',
        })
      }

      const updatedOrder = await prisma.artworkOrder.update({
        where: {
          reference: order.reference,
        },
        data: {
          deliveryProgress: progress,
          courierName: courierName || null,
          trackingNumber: trackingNumber || null,
          status: progress === 'DELIVERED' ? 'FULFILLED' : 'PAID',
        },
        include: {
          artwork: {
            select: {
              title: true,
              slug: true,
              imageUrl: true,
            },
          },
        },
      })

      const trackingUrl = `${getClientUrl()}/order-status/${updatedOrder.reference}`

      let updateEmailSent = false

      try {
        const emailResult = await sendArtworkOrderUpdateEmail({
          customerName: updatedOrder.customerName,
          customerEmail: updatedOrder.customerEmail,
          artworkTitle: updatedOrder.artwork.title,
          progress: updatedOrder.deliveryProgress,
          courierName: updatedOrder.courierName,
          trackingNumber: updatedOrder.trackingNumber,
          trackingUrl,
        })

        updateEmailSent = Boolean(emailResult?.id)
      } catch (emailError) {
        console.error('Order update email could not be sent:', emailError)
      }

      res.json({
        success: true,
        message: updateEmailSent
          ? 'Delivery progress updated and emailed to the buyer.'
          : 'Delivery progress updated, but the email could not be sent.',
        data: updatedOrder,
        trackingUrl,
        updateEmailSent,
      })
    } catch (error) {
      next(error)
    }
  },
)

/*
  Public: safe buyer-facing tracking data.
  The random order reference acts as the secure tracking key.
*/
router.get('/:reference/tracking', async (req, res, next) => {
  try {
    const order = await prisma.artworkOrder.findUnique({
      where: {
        reference: req.params.reference,
      },
      select: {
        reference: true,
        status: true,
        deliveryProgress: true,
        courierName: true,
        trackingNumber: true,
        createdAt: true,
        updatedAt: true,
        artwork: {
          select: {
            title: true,
            imageUrl: true,
            alt: true,
          },
        },
      },
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order tracking link not found.',
      })
    }

    res.json({
      success: true,
      data: order,
    })
  } catch (error) {
    next(error)
  }
})

/*
  Public: create secure Razorpay checkout.
*/
router.post('/', async (req, res, next) => {
  try {
    const result = checkoutSchema.safeParse(req.body)

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Please check your checkout details.',
        errors: result.error.flatten().fieldErrors,
      })
    }

    const customer = result.data

    const reservation = await prisma.$transaction(async (transaction) => {
      const artwork = await transaction.artwork.findUnique({
        where: {
          slug: customer.artworkSlug,
        },
      })

      if (!artwork) {
        throw new Error('Artwork not found.')
      }

      if (artwork.availability !== 'AVAILABLE') {
        throw new Error('This artwork is no longer available to purchase.')
      }

      if (!artwork.priceInPaise || artwork.priceInPaise < 1) {
        throw new Error('This artwork does not have a purchase price yet.')
      }

      const order = await transaction.artworkOrder.create({
        data: {
          artworkId: artwork.id,
          customerName: customer.customerName,
          customerEmail: customer.customerEmail,
          customerPhone: customer.customerPhone || null,
          shippingAddress: customer.shippingAddress,
          city: customer.city,
          state: customer.state,
          postalCode: customer.postalCode,
          amountInPaise: artwork.priceInPaise,
          currency: artwork.currency,
          status: 'PENDING_PAYMENT',
          deliveryProgress: 'PAYMENT_RECEIVED',
        },
      })

      await transaction.artwork.update({
        where: {
          id: artwork.id,
        },
        data: {
          availability: 'RESERVED',
        },
      })

      return { artwork, order }
    })

    let razorpayOrder

    try {
      razorpayOrder = await razorpay.orders.create({
        amount: reservation.order.amountInPaise,
        currency: reservation.order.currency,
        receipt: `kv_${reservation.order.reference.slice(-24)}`,
        notes: {
          kalavista_order_reference: reservation.order.reference,
          artwork_slug: reservation.artwork.slug,
          artwork_title: reservation.artwork.title,
        },
      })
    } catch (error) {
      await prisma.$transaction(async (transaction) => {
        await transaction.artworkOrder.update({
          where: {
            id: reservation.order.id,
          },
          data: {
            status: 'CANCELLED',
          },
        })

        await transaction.artwork.update({
          where: {
            id: reservation.artwork.id,
          },
          data: {
            availability: 'AVAILABLE',
          },
        })
      })

      throw error
    }

    const order = await prisma.artworkOrder.update({
      where: {
        id: reservation.order.id,
      },
      data: {
        razorpayOrderId: razorpayOrder.id,
      },
    })

    return res.status(201).json({
      success: true,
      message: 'Secure checkout is ready.',
      data: {
        reference: order.reference,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        amountInPaise: order.amountInPaise,
        currency: order.currency,
        artwork: {
          title: reservation.artwork.title,
          imageUrl: reservation.artwork.imageUrl,
        },
      },
    })
  } catch (error) {
    const knownMessage = [
      'Artwork not found.',
      'This artwork is no longer available to purchase.',
      'This artwork does not have a purchase price yet.',
    ].includes(error.message)

    if (knownMessage) {
      return res.status(400).json({
        success: false,
        message: error.message,
      })
    }

    next(error)
  }
})

/*
  Public: verify Razorpay payment and send first buyer tracking email.
*/
router.post('/:reference/verify-payment', async (req, res, next) => {
  try {
    const verification = paymentVerificationSchema.safeParse(req.body)

    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification data is incomplete.',
      })
    }

    const order = await prisma.artworkOrder.findUnique({
      where: {
        reference: req.params.reference,
      },
      include: {
        artwork: true,
      },
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      })
    }

    if (order.status === 'PAID' || order.status === 'FULFILLED') {
      return res.json({
        success: true,
        message: 'This payment was already verified.',
        data: {
          reference: order.reference,
          status: order.status,
          trackingUrl: `${getClientUrl()}/order-status/${order.reference}`,
        },
      })
    }

    if (
      order.status !== 'PENDING_PAYMENT' ||
      order.razorpayOrderId !== verification.data.razorpayOrderId
    ) {
      return res.status(400).json({
        success: false,
        message: 'This order cannot be verified.',
      })
    }

    const signatureBody = `${verification.data.razorpayOrderId}|${verification.data.razorpayPaymentId}`

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(signatureBody)
      .digest('hex')

    const isSignatureValid =
      expectedSignature.length === verification.data.razorpaySignature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(verification.data.razorpaySignature),
      )

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: 'Payment signature could not be verified.',
      })
    }

    const paidOrder = await prisma.$transaction(async (transaction) => {
      const updatedOrder = await transaction.artworkOrder.update({
        where: {
          id: order.id,
        },
        data: {
          status: 'PAID',
          deliveryProgress: 'PAYMENT_RECEIVED',
          razorpayPaymentId: verification.data.razorpayPaymentId,
          razorpaySignature: verification.data.razorpaySignature,
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
          id: order.artworkId,
        },
        data: {
          availability: 'SOLD',
        },
      })

      return updatedOrder
    })

    const trackingUrl = `${getClientUrl()}/order-status/${paidOrder.reference}`

    let paymentEmailSent = false

    try {
      const emailResult = await sendArtworkOrderUpdateEmail({
        customerName: paidOrder.customerName,
        customerEmail: paidOrder.customerEmail,
        artworkTitle: paidOrder.artwork.title,
        progress: 'PAYMENT_RECEIVED',
        trackingUrl,
      })

      paymentEmailSent = Boolean(emailResult?.id)
    } catch (emailError) {
      console.error(
        'Artwork-order payment email could not be sent:',
        emailError,
      )
    }

    return res.json({
      success: true,
      message: 'Payment verified. Your artwork is reserved for delivery.',
      data: {
        reference: paidOrder.reference,
        status: paidOrder.status,
        trackingUrl,
        paymentEmailSent,
      },
    })
  } catch (error) {
    next(error)
  }
})

/*
  Public: release a pending reservation when checkout is closed.
*/
router.post('/:reference/cancel', async (req, res, next) => {
  try {
    const order = await prisma.artworkOrder.findUnique({
      where: {
        reference: req.params.reference,
      },
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      })
    }

    if (order.status !== 'PENDING_PAYMENT') {
      return res.json({
        success: true,
        message: 'No pending reservation needs to be released.',
      })
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.artworkOrder.update({
        where: {
          id: order.id,
        },
        data: {
          status: 'CANCELLED',
        },
      })

      await transaction.artwork.update({
        where: {
          id: order.artworkId,
        },
        data: {
          availability: 'AVAILABLE',
        },
      })
    })

    return res.json({
      success: true,
      message: 'Artwork reservation released.',
    })
  } catch (error) {
    next(error)
  }
})

export default router
