import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import requireAdmin from '../middleware/requireAdmin.js'
import { sendCommissionQuoteEmail } from '../lib/email.js'

const router = Router()

const createEnquirySchema = z.object({
  name: z.string().trim().min(2, 'Name must contain at least 2 characters.'),
  email: z.string().trim().email('Enter a valid email address.'),
  artworkType: z.string().trim().min(2, 'Choose an artwork type.'),
  budget: z.string().trim().max(80).optional(),
  message: z
    .string()
    .trim()
    .min(10, 'Please share at least a little detail about your request.')
    .max(2000),
  timeline: z.string().trim().max(100).optional(),
  artworkSlug: z.string().trim().max(160).optional(),
})

const updateStatusSchema = z.object({
  status: z.enum(['NEW', 'REVIEWING', 'ACCEPTED', 'DECLINED']),
})

const commissionQuoteSchema = z.object({
  totalPriceInPaise: z.coerce
    .number()
    .int()
    .min(100, 'The quote must be at least ₹1.'),
  currency: z.string().trim().length(3).default('INR'),
})

const commissionProgressSchema = z.object({
  progress: z.enum([
    'REQUEST_RECEIVED',
    'QUOTE_READY',
    'ADVANCE_RECEIVED',
    'IN_PROGRESS',
    'PREVIEW_READY',
    'COMPLETED',
    'CANCELLED',
  ]),
})

/*
  Public: a visitor sends a custom commission enquiry.
*/
router.post('/', async (req, res, next) => {
  try {
    const result = createEnquirySchema.safeParse(req.body)

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Please check the form fields.',
        errors: result.error.flatten().fieldErrors,
      })
    }

    const { name, email, artworkType, budget, message, timeline, artworkSlug } =
      result.data

    let artworkId = null

    if (artworkSlug) {
      const artwork = await prisma.artwork.findUnique({
        where: {
          slug: artworkSlug,
        },
        select: {
          id: true,
        },
      })

      if (!artwork) {
        return res.status(404).json({
          success: false,
          message: 'The selected artwork was not found.',
        })
      }

      artworkId = artwork.id
    }

    const enquiry = await prisma.commissionEnquiry.create({
      data: {
        name,
        email,
        artworkType,
        budget: budget || null,
        message,
        timeline: timeline || null,
        artworkId,
      },
    })

    res.status(201).json({
      success: true,
      message: 'Your enquiry has been received.',
      data: enquiry,
    })
  } catch (error) {
    next(error)
  }
})

/*
  Protected: Studio reads all commission enquiries.
*/
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const enquiries = await prisma.commissionEnquiry.findMany({
      include: {
        artwork: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
        payment: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json({
      success: true,
      count: enquiries.length,
      data: enquiries,
    })
  } catch (error) {
    next(error)
  }
})

/*
  Protected: Studio changes the internal enquiry status.
*/
router.patch('/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const enquiryId = Number(req.params.id)
    const result = updateStatusSchema.safeParse(req.body)

    if (!Number.isInteger(enquiryId) || enquiryId < 1) {
      return res.status(400).json({
        success: false,
        message: 'A valid enquiry ID is required.',
      })
    }

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Choose a valid enquiry status.',
      })
    }

    const existingEnquiry = await prisma.commissionEnquiry.findUnique({
      where: {
        id: enquiryId,
      },
      select: {
        id: true,
      },
    })

    if (!existingEnquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found.',
      })
    }

    const enquiry = await prisma.commissionEnquiry.update({
      where: {
        id: enquiryId,
      },
      data: {
        status: result.data.status,
      },
      include: {
        artwork: {
          select: {
            slug: true,
            title: true,
          },
        },
      },
    })

    res.json({
      success: true,
      message: 'Enquiry status updated.',
      data: enquiry,
    })
  } catch (error) {
    next(error)
  }
})

/*
  Protected: Studio sets/revises a final quote.
  This generates a payment link, tracking link, and emails both to the client.
*/
router.post('/:id/quote', requireAdmin, async (req, res, next) => {
  try {
    const enquiryId = Number(req.params.id)
    const parsedQuote = commissionQuoteSchema.safeParse(req.body)

    if (!Number.isInteger(enquiryId) || enquiryId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid commission enquiry id.',
      })
    }

    if (!parsedQuote.success) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid final quote.',
        errors: parsedQuote.error.flatten().fieldErrors,
      })
    }

    const enquiry = await prisma.commissionEnquiry.findUnique({
      where: {
        id: enquiryId,
      },
      include: {
        payment: true,
      },
    })

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Commission enquiry not found.',
      })
    }

    if (enquiry.status === 'DECLINED') {
      return res.status(400).json({
        success: false,
        message: 'A declined commission cannot receive a payment quote.',
      })
    }

    if (
      enquiry.payment?.status === 'ADVANCE_PAID' ||
      enquiry.payment?.status === 'FULLY_PAID'
    ) {
      return res.status(400).json({
        success: false,
        message: 'This commission already has a confirmed payment.',
      })
    }

    const totalPriceInPaise = parsedQuote.data.totalPriceInPaise
    const advanceInPaise = Math.round(totalPriceInPaise * 0.6)
    const currency = parsedQuote.data.currency.toUpperCase()

    const payment = await prisma.commissionPayment.upsert({
      where: {
        enquiryId,
      },
      create: {
        enquiryId,
        totalPriceInPaise,
        advanceInPaise,
        amountDueInPaise: advanceInPaise,
        currency,
        status: 'AWAITING_ADVANCE',
      },
      update: {
        totalPriceInPaise,
        advanceInPaise,
        amountDueInPaise: advanceInPaise,
        currency,
        paymentPreference: 'ADVANCE_60',
        status: 'AWAITING_ADVANCE',
        razorpayOrderId: null,
        razorpayPaymentId: null,
        razorpaySignature: null,
      },
    })

    await prisma.commissionEnquiry.update({
      where: {
        id: enquiryId,
      },
      data: {
        status: 'REVIEWING',
        progress: 'QUOTE_READY',
      },
    })

    const clientUrl = (
      process.env.CLIENT_URL ?? 'http://localhost:5173'
    ).replace(/\/$/, '')

    const paymentUrl = `${clientUrl}/commission-payment/${payment.reference}`
    const trackingUrl = `${clientUrl}/commission-status/${enquiry.trackingReference}`

    // Email failure does not undo a valid quote in the database.
    let quoteEmailSent = false

    try {
      const emailResult = await sendCommissionQuoteEmail({
        customerName: enquiry.name,
        customerEmail: enquiry.email,
        artworkType: enquiry.artworkType,
        totalPriceInPaise: payment.totalPriceInPaise,
        advanceInPaise: payment.advanceInPaise,
        currency: payment.currency,
        paymentUrl,
        trackingUrl,
      })

      quoteEmailSent = Boolean(emailResult?.id)
    } catch (emailError) {
      console.error('Commission quote email could not be sent:', emailError)
    }

    res.status(201).json({
      success: true,
      message: quoteEmailSent
        ? 'Commission quote created and emailed to the client.'
        : 'Commission quote created, but email could not be sent. Copy the links manually.',
      data: {
        enquiryId,
        customerName: enquiry.name,
        customerEmail: enquiry.email,
        totalPriceInPaise: payment.totalPriceInPaise,
        advanceInPaise: payment.advanceInPaise,
        currency: payment.currency,
        paymentStatus: payment.status,
        paymentReference: payment.reference,
        paymentUrl,
        trackingUrl,
        quoteEmailSent,
      },
    })
  } catch (error) {
    next(error)
  }
})

/*
  Protected: Studio updates client-visible commission progress.
*/
router.patch('/:id/progress', requireAdmin, async (req, res, next) => {
  try {
    const enquiryId = Number(req.params.id)
    const parsedProgress = commissionProgressSchema.safeParse(req.body)

    if (!Number.isInteger(enquiryId) || enquiryId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid commission enquiry id.',
      })
    }

    if (!parsedProgress.success) {
      return res.status(400).json({
        success: false,
        message: 'Please choose a valid commission stage.',
      })
    }

    const enquiry = await prisma.commissionEnquiry.update({
      where: {
        id: enquiryId,
      },
      data: {
        progress: parsedProgress.data.progress,
      },
      select: {
        id: true,
        trackingReference: true,
        progress: true,
        updatedAt: true,
      },
    })

    res.json({
      success: true,
      message: 'Client tracking progress updated.',
      data: enquiry,
    })
  } catch (error) {
    next(error)
  }
})

export default router
