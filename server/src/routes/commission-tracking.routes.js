import { Router } from 'express'
import prisma from '../lib/prisma.js'
import {
  buildOutcomeMessage,
  performCommissionCancellation,
} from '../lib/commission-cancel.js'

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

/*
  Public: the client cancels their own commission.
  The random tracking reference acts as the secure access key.
  Same refund rules apply as when the studio cancels.
*/
router.post('/:trackingReference/cancel', async (req, res, next) => {
  try {
    const tracking = await prisma.commissionEnquiry.findUnique({
      where: {
        trackingReference: req.params.trackingReference,
      },
      select: { id: true },
    })

    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Commission tracker not found.',
      })
    }

    const result = await performCommissionCancellation(tracking.id)

    if (result.error === 'not_found') {
      return res.status(404).json({
        success: false,
        message: 'Commission enquiry not found.',
      })
    }

    if (result.error === 'already_cancelled') {
      return res.json({
        success: true,
        message: 'This commission is already cancelled.',
        outcome: null,
      })
    }

    res.json({
      success: true,
      message: buildOutcomeMessage(result.outcome),
      outcome: {
        ...result.outcome,
        emailSent: result.emailSent,
      },
    })
  } catch (error) {
    next(error)
  }
})

export default router
