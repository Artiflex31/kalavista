import prisma from './prisma.js'
import { sendCommissionCancellationEmail } from './email.js'

const IN_PRODUCTION_STAGES = ['IN_PROGRESS', 'PREVIEW_READY', 'COMPLETED']

export function computeRefundOutcome(enquiry) {
  const hasPayment =
    enquiry.payment &&
    (enquiry.payment.status === 'ADVANCE_PAID' ||
      enquiry.payment.status === 'FULLY_PAID')

  const isInProduction = IN_PRODUCTION_STAGES.includes(enquiry.progress)

  let refundAmountInPaise = 0
  let retainedAmountInPaise = 0
  let outcomeType = 'no_payment'

  if (hasPayment) {
    const total = enquiry.payment.totalPriceInPaise
    const advance = enquiry.payment.advanceInPaise
    const isFullyPaid = enquiry.payment.status === 'FULLY_PAID'

    if (isInProduction) {
      if (isFullyPaid) {
        refundAmountInPaise = total - advance
        retainedAmountInPaise = advance
        outcomeType = 'partial_refund'
      } else {
        refundAmountInPaise = 0
        retainedAmountInPaise = advance
        outcomeType = 'no_refund'
      }
    } else {
      refundAmountInPaise = isFullyPaid ? total : advance
      retainedAmountInPaise = 0
      outcomeType = 'full_refund'
    }
  }

  return {
    outcomeType,
    refundAmountInPaise,
    retainedAmountInPaise,
    hasPayment,
    isInProduction,
  }
}

export function formatInr(amountInPaise) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format((amountInPaise ?? 0) / 100)
}

export function buildOutcomeMessage(outcome) {
  if (outcome.outcomeType === 'no_payment') {
    return 'Commission cancelled. No payment was recorded, so no refund is needed.'
  }

  if (outcome.outcomeType === 'full_refund') {
    return `Commission cancelled. Full refund of ${formatInr(
      outcome.refundAmountInPaise,
    )} to be processed.`
  }

  if (outcome.outcomeType === 'partial_refund') {
    return `Commission cancelled. Refund of ${formatInr(
      outcome.refundAmountInPaise,
    )} (final 40%) to be processed. Advance of ${formatInr(
      outcome.retainedAmountInPaise,
    )} retained per policy.`
  }

  // no_refund
  return `Commission cancelled. Advance of ${formatInr(
    outcome.retainedAmountInPaise,
  )} retained per policy (artwork was in production).`
}

/*
  Cancels a commission by id. Sends the customer email.
  Returns { error } if the enquiry cannot be cancelled.
*/
export async function performCommissionCancellation(enquiryId) {
  const enquiry = await prisma.commissionEnquiry.findUnique({
    where: { id: enquiryId },
    include: { payment: true },
  })

  if (!enquiry) {
    return { error: 'not_found' }
  }

  if (enquiry.progress === 'CANCELLED') {
    return { error: 'already_cancelled', enquiry }
  }

  const outcome = computeRefundOutcome(enquiry)

  const updatedEnquiry = await prisma.$transaction(async (transaction) => {
    const saved = await transaction.commissionEnquiry.update({
      where: { id: enquiry.id },
      data: {
        status: 'DECLINED',
        progress: 'CANCELLED',
      },
      include: {
        payment: true,
        artwork: {
          select: { slug: true, title: true },
        },
      },
    })

    if (enquiry.payment) {
      await transaction.commissionPayment.update({
        where: { id: enquiry.payment.id },
        data: { status: 'CANCELLED' },
      })
    }

    return saved
  })

  let emailSent = false

  if (enquiry.email) {
    try {
      await sendCommissionCancellationEmail({
        customerName: enquiry.name,
        customerEmail: enquiry.email,
        artworkType: enquiry.artworkType,
        refundAmountInPaise: outcome.refundAmountInPaise,
        retainedAmountInPaise: outcome.retainedAmountInPaise,
        totalPriceInPaise: enquiry.payment?.totalPriceInPaise ?? 0,
        currency: enquiry.payment?.currency ?? 'INR',
        outcomeType: outcome.outcomeType,
      })
      emailSent = true
    } catch (emailError) {
      console.error('Commission cancellation email failed:', emailError)
    }
  }

  return {
    enquiry: updatedEnquiry,
    outcome,
    emailSent,
  }
}
