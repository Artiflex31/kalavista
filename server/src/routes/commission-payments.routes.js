import requireAdmin from '../middleware/requireAdmin.js'
import {
  sendFinalPaymentConfirmationEmail,
  sendFinalPaymentRequestEmail,
} from '../lib/commission-final-email.js'
import crypto from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import razorpay from '../lib/razorpay.js'
import { sendCommissionPaymentConfirmationEmail } from '../lib/email.js'

const router = Router()

const paymentChoiceSchema = z.object({
  paymentPreference: z.enum(['ADVANCE_60', 'FULL_PAYMENT']),
})

const paymentVerificationSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
})

function formatPaymentData(payment) {
  return {
    reference: payment.reference,
    artworkType: payment.enquiry.artworkType,
    totalPriceInPaise: payment.totalPriceInPaise,
    advanceInPaise: payment.advanceInPaise,
    finalAmountInPaise: payment.finalAmountInPaise,
    finalPaymentStatus: payment.finalPaymentStatus,
    amountDueInPaise: payment.amountDueInPaise,
    currency: payment.currency,
    paymentPreference: payment.paymentPreference,
    status: payment.status,
  }
}

/*
  Public: reads a safe version of a commission payment link.
*/
router.get('/:reference', async (req, res, next) => {
  try {
    const payment = await prisma.commissionPayment.findUnique({
      where: {
        reference: req.params.reference,
      },
      include: {
        enquiry: {
          select: {
            artworkType: true,
          },
        },
      },
    })

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Commission payment link not found.',
      })
    }

    res.json({
      success: true,
      data: formatPaymentData(payment),
    })
  } catch (error) {
    next(error)
  }
})

/*
  Public: client chooses 60% advance or full payment.
  A new Razorpay order is created for the selected amount.
*/
router.post('/:reference/create-order', async (req, res, next) => {
  try {
    const parsedChoice = paymentChoiceSchema.safeParse(req.body)

    if (!parsedChoice.success) {
      return res.status(400).json({
        success: false,
        message: 'Choose either the 60% advance or full payment.',
      })
    }

    const payment = await prisma.commissionPayment.findUnique({
      where: {
        reference: req.params.reference,
      },
    })

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Commission payment link not found.',
      })
    }

    if (payment.status === 'ADVANCE_PAID' || payment.status === 'FULLY_PAID') {
      return res.json({
        success: true,
        message: 'This payment was already verified.',
        data: {
          reference: payment.reference,
          status: payment.status,
          amountDueInPaise: payment.amountDueInPaise,
          currency: payment.currency,
          paymentEmailSent: false,
        },
      })
    }

    if (payment.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'This commission payment link is no longer active.',
      })
    }

    const paymentPreference = parsedChoice.data.paymentPreference

    const amountDueInPaise =
      paymentPreference === 'FULL_PAYMENT'
        ? payment.totalPriceInPaise
        : payment.advanceInPaise

    const razorpayOrder = await razorpay.orders.create({
      amount: amountDueInPaise,
      currency: payment.currency,
      receipt: `commission_${payment.reference}`,
      notes: {
        kind: 'commission',
        commissionReference: payment.reference,
        paymentPreference,
      },
    })

    const updatedPayment = await prisma.commissionPayment.update({
      where: {
        id: payment.id,
      },
      data: {
        paymentPreference,
        amountDueInPaise,
        status: 'AWAITING_ADVANCE',
        razorpayOrderId: razorpayOrder.id,
        razorpayPaymentId: null,
        razorpaySignature: null,
      },
      include: {
        enquiry: {
          select: {
            artworkType: true,
          },
        },
      },
    })

    res.status(201).json({
      success: true,
      message: 'Payment checkout is ready.',
      data: {
        ...formatPaymentData(updatedPayment),
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        razorpayOrderId: razorpayOrder.id,
      },
    })
  } catch (error) {
    next(error)
  }
})
/*
  Public: verifies Razorpay payment signature on the server.
*/
router.post('/:reference/verify-payment', async (req, res, next) => {
  try {
    const parsedPayment = paymentVerificationSchema.safeParse(req.body)

    if (!parsedPayment.success) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification details are missing.',
      })
    }

    const payment = await prisma.commissionPayment.findUnique({
      where: {
        reference: req.params.reference,
      },
      include: {
        enquiry: true,
      },
    })

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Commission payment link not found.',
      })
    }

    if (payment.status === 'ADVANCE_PAID' || payment.status === 'FULLY_PAID') {
      return res.status(400).json({
        success: false,
        message: 'This commission payment has already been completed.',
      })
    }

    if (payment.razorpayOrderId !== parsedPayment.data.razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: 'This payment does not belong to this commission.',
      })
    }

    const signatureBody = `${parsedPayment.data.razorpay_order_id}|${parsedPayment.data.razorpay_payment_id}`

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(signatureBody)
      .digest('hex')

    const receivedSignature = parsedPayment.data.razorpay_signature

    const isSignatureValid =
      expectedSignature.length === receivedSignature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(receivedSignature),
      )

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: 'Payment signature could not be verified.',
      })
    }

    const completedStatus =
      payment.paymentPreference === 'FULL_PAYMENT'
        ? 'FULLY_PAID'
        : 'ADVANCE_PAID'

    const updatedPayment = await prisma.$transaction(async (transaction) => {
      const savedPayment = await transaction.commissionPayment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: completedStatus,
          amountDueInPaise: 0,
          razorpayPaymentId: parsedPayment.data.razorpay_payment_id,
          razorpaySignature: parsedPayment.data.razorpay_signature,
        },
      })

      await transaction.commissionEnquiry.update({
        where: {
          id: payment.enquiryId,
        },
        data: {
          status: 'ACCEPTED',
          progress: 'ADVANCE_RECEIVED',
        },
      })

      return savedPayment
    })

    // Email is outside the database transaction.
    const clientUrl = (
      process.env.CLIENT_URL ?? 'http://localhost:5173'
    ).replace(/\/$/, '')

    const trackingUrl = `${clientUrl}/commission-status/${payment.enquiry.trackingReference}`

    let paymentEmailSent = false

    try {
      const emailResult = await sendCommissionPaymentConfirmationEmail({
        customerName: payment.enquiry.name,
        customerEmail: payment.enquiry.email,
        paymentPreference: payment.paymentPreference,
        paidAmountInPaise: payment.amountDueInPaise,
        currency: payment.currency,
        trackingUrl,
      })

      paymentEmailSent = Boolean(emailResult?.id)
    } catch (emailError) {
      console.error('Payment confirmation email could not be sent:', emailError)
    }

    res.json({
      success: true,
      message:
        completedStatus === 'FULLY_PAID'
          ? 'Full commission payment received successfully.'
          : '60% commission advance received successfully.',
      data: {
        reference: updatedPayment.reference,
        status: updatedPayment.status,
        amountDueInPaise: updatedPayment.amountDueInPaise,
        currency: updatedPayment.currency,
        paymentEmailSent,
      },
    })
  } catch (error) {
    next(error)
  }
})
/*
  Protected: Studio requests the remaining 40% payment.
*/
router.post(
  '/:reference/request-final-payment',
  requireAdmin,
  async (req, res, next) => {
    try {
      const payment = await prisma.commissionPayment.findUnique({
        where: {
          reference: req.params.reference,
        },
        include: {
          enquiry: true,
        },
      })

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Commission payment not found.',
        })
      }

      if (payment.status === 'FULLY_PAID') {
        return res.status(400).json({
          success: false,
          message: 'This commission is already fully paid.',
        })
      }

      if (payment.status !== 'ADVANCE_PAID') {
        return res.status(400).json({
          success: false,
          message:
            'The 60% advance must be paid before requesting the final balance.',
        })
      }

      const finalAmountInPaise =
        payment.totalPriceInPaise - payment.advanceInPaise

      if (finalAmountInPaise < 1) {
        return res.status(400).json({
          success: false,
          message: 'This commission has no remaining balance.',
        })
      }

      const updatedPayment = await prisma.commissionPayment.update({
        where: {
          id: payment.id,
        },
        data: {
          finalAmountInPaise,
          finalPaymentStatus: 'AWAITING_PAYMENT',
          finalRazorpayOrderId: null,
          finalRazorpayPaymentId: null,
          finalRazorpaySignature: null,
        },
      })

      const clientUrl = (
        process.env.CLIENT_URL ?? 'http://localhost:5173'
      ).replace(/\/$/, '')

      const paymentUrl = `${clientUrl}/commission-final-payment/${payment.reference}`

      let finalPaymentEmailSent = false

      try {
        const emailResult = await sendFinalPaymentRequestEmail({
          customerName: payment.enquiry.name,
          customerEmail: payment.enquiry.email,
          finalAmountInPaise: updatedPayment.finalAmountInPaise,
          currency: updatedPayment.currency,
          paymentUrl,
        })

        finalPaymentEmailSent = Boolean(emailResult?.id)
      } catch (emailError) {
        console.error('Final payment request email failed:', emailError)
      }

      res.json({
        success: true,
        message: finalPaymentEmailSent
          ? 'Final payment link created and emailed to the client.'
          : 'Final payment link created, but email could not be sent.',
        data: {
          reference: updatedPayment.reference,
          finalAmountInPaise: updatedPayment.finalAmountInPaise,
          finalPaymentStatus: updatedPayment.finalPaymentStatus,
          currency: updatedPayment.currency,
          paymentUrl,
          finalPaymentEmailSent,
        },
      })
    } catch (error) {
      next(error)
    }
  },
)

/*
  Public: creates Razorpay checkout for the remaining 40%.
*/
router.post('/:reference/create-final-order', async (req, res, next) => {
  try {
    const payment = await prisma.commissionPayment.findUnique({
      where: {
        reference: req.params.reference,
      },
    })

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Commission payment link not found.',
      })
    }

    if (
      payment.status !== 'ADVANCE_PAID' ||
      payment.finalPaymentStatus !== 'AWAITING_PAYMENT'
    ) {
      return res.status(400).json({
        success: false,
        message: 'The final payment is not available yet.',
      })
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: payment.finalAmountInPaise,
      currency: payment.currency,
      receipt: `commission_final_${payment.reference.slice(-20)}`,
      notes: {
        kind: 'commission-final-payment',
        commissionReference: payment.reference,
      },
    })

    await prisma.commissionPayment.update({
      where: {
        id: payment.id,
      },
      data: {
        finalRazorpayOrderId: razorpayOrder.id,
      },
    })

    res.status(201).json({
      success: true,
      message: 'Final payment checkout is ready.',
      data: {
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        razorpayOrderId: razorpayOrder.id,
        amountInPaise: payment.finalAmountInPaise,
        currency: payment.currency,
      },
    })
  } catch (error) {
    next(error)
  }
})

/*
  Public: verifies final 40% Razorpay payment.
*/
router.post('/:reference/verify-final-payment', async (req, res, next) => {
  try {
    const parsedPayment = paymentVerificationSchema.safeParse(req.body)

    if (!parsedPayment.success) {
      return res.status(400).json({
        success: false,
        message: 'Final payment verification details are missing.',
      })
    }

    const payment = await prisma.commissionPayment.findUnique({
      where: {
        reference: req.params.reference,
      },
      include: {
        enquiry: true,
      },
    })

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Commission payment link not found.',
      })
    }

    if (
      payment.status === 'FULLY_PAID' ||
      payment.finalPaymentStatus === 'PAID'
    ) {
      return res.json({
        success: true,
        message: 'This final payment was already verified.',
        data: {
          reference: payment.reference,
          status: payment.status,
          finalPaymentStatus: payment.finalPaymentStatus,
        },
      })
    }

    if (
      payment.finalPaymentStatus !== 'AWAITING_PAYMENT' ||
      payment.finalRazorpayOrderId !== parsedPayment.data.razorpay_order_id
    ) {
      return res.status(400).json({
        success: false,
        message: 'This final payment does not belong to this commission.',
      })
    }

    const signatureBody = `${parsedPayment.data.razorpay_order_id}|${parsedPayment.data.razorpay_payment_id}`

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(signatureBody)
      .digest('hex')

    const receivedSignature = parsedPayment.data.razorpay_signature

    const isSignatureValid =
      expectedSignature.length === receivedSignature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(receivedSignature),
      )

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: 'Final payment signature could not be verified.',
      })
    }

    const updatedPayment = await prisma.$transaction(async (transaction) => {
      const savedPayment = await transaction.commissionPayment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: 'FULLY_PAID',
          finalPaymentStatus: 'PAID',
          finalRazorpayPaymentId: parsedPayment.data.razorpay_payment_id,
          finalRazorpaySignature: parsedPayment.data.razorpay_signature,
        },
      })

      await transaction.commissionEnquiry.update({
        where: {
          id: payment.enquiryId,
        },
        data: {
          status: 'ACCEPTED',
          progress: 'COMPLETED',
        },
      })

      return savedPayment
    })

    const clientUrl = (
      process.env.CLIENT_URL ?? 'http://localhost:5173'
    ).replace(/\/$/, '')

    const trackingUrl = `${clientUrl}/commission-status/${payment.enquiry.trackingReference}`

    let finalPaymentEmailSent = false

    try {
      const emailResult = await sendFinalPaymentConfirmationEmail({
        customerName: payment.enquiry.name,
        customerEmail: payment.enquiry.email,
        finalAmountInPaise: payment.finalAmountInPaise,
        currency: payment.currency,
        trackingUrl,
      })

      finalPaymentEmailSent = Boolean(emailResult?.id)
    } catch (emailError) {
      console.error('Final payment confirmation email failed:', emailError)
    }

    res.json({
      success: true,
      message: 'Final payment received. Your commission is fully paid.',
      data: {
        reference: updatedPayment.reference,
        status: updatedPayment.status,
        finalPaymentStatus: updatedPayment.finalPaymentStatus,
        finalPaymentEmailSent,
      },
    })
  } catch (error) {
    next(error)
  }
})
export default router
