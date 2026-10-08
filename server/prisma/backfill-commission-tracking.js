import crypto from 'node:crypto'
import prisma from '../src/lib/prisma.js'

async function main() {
  const enquiries = await prisma.commissionEnquiry.findMany({
    where: {
      trackingReference: null,
    },
    select: {
      id: true,
    },
  })

  for (const enquiry of enquiries) {
    await prisma.commissionEnquiry.update({
      where: {
        id: enquiry.id,
      },
      data: {
        trackingReference: crypto.randomUUID(),
      },
    })
  }

  console.log(
    `Added secure tracking references to ${enquiries.length} existing commission request(s).`,
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
