import { Router } from 'express'
import prisma from '../lib/prisma.js'

const router = Router()

/*
  Public but privacy-safe:
  The client can view only their commission stage and payment information.
  We do NOT return their email, message, address, or other client records.
*/
router.get('/:trackingReference', async (req, res, next) => {
  try {
    const enquiry = await prisma.commissionEnquiry.findUnique({
      where: {
        trackingReference: req.params.trackingReference,
      },
      select: {
        trackingReference: true,
        artworkType: true,
        progress: true,
        createdAt: true,
        updatedAt: true,
        payment: {
          select: {
            reference: true,
            totalPriceInPaise: true,
            advanceInPaise: true,
            amountDueInPaise: true,
            currency: true,
            paymentPreference: true,
            status: true,
            updatedAt: true,
          },
        },
      },
    })

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Commission tracker not found.',
      })
    }

    res.json({
      success: true,
      data: enquiry,
    })
  } catch (error) {
    next(error)
  }
})

export default router
