import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString = process.env.DIRECT_URL

if (!connectionString) {
  throw new Error('DIRECT_URL is missing from .env')
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const artworks = [
  {
    slug: 'monsoon-silence',
    title: 'Monsoon Silence',
    medium: 'Acrylic on canvas',
    year: 2026,
    dimensions: '24 × 30 in',
    collection: 'Monsoon Studies',
    moods: ['Quiet', 'Reflective'],
    categories: ['monsoon-studies'],
    availability: 'AVAILABLE',
    priceInPaise: 650000,
    currency: 'INR',
    story:
      'A quiet study of rain, memory, and the pause that arrives when a familiar city becomes still.',
    isFeatured: true,
  },
  {
    slug: 'letters-to-the-sky',
    title: 'Letters to the Sky',
    medium: 'Mixed media on paper',
    year: 2025,
    dimensions: '18 × 24 in',
    collection: 'Small Messages',
    moods: ['Airy', 'Hopeful'],
    categories: ['small-messages'],
    availability: 'AVAILABLE',
    priceInPaise: 420000,
    currency: 'INR',
    story:
      'A collection of unfinished thoughts, translated into layers of colour, line, and open space.',
    isFeatured: true,
  },
  {
    slug: 'earth-remembers',
    title: 'Earth Remembers',
    medium: 'Watercolour and ink',
    year: 2025,
    dimensions: '20 × 25 in',
    collection: 'Soil & Story',
    moods: ['Grounded', 'Warm'],
    categories: ['soil-story', 'watercolour'],
    availability: 'AVAILABLE',
    priceInPaise: 520000,
    currency: 'INR',
    story:
      'This work follows the textures of soil and the small marks that remain after time has moved on.',
    isFeatured: true,
  },
]

async function main() {
  for (const artwork of artworks) {
    await prisma.artwork.upsert({
      where: {
        slug: artwork.slug,
      },
      update: artwork,
      create: artwork,
    })
  }

  console.log(`Seeded ${artworks.length} artworks.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
