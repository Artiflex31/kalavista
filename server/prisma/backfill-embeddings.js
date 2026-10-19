import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { GoogleGenAI } from '@google/genai'

const connectionString = process.env.DIRECT_URL
if (!connectionString) throw new Error('DIRECT_URL is missing in .env')

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

async function main() {
  // Find artworks without embeddings
  const artworks = await prisma.$queryRawUnsafe(
    `SELECT id, slug, title, medium, collection, story, moods, colors, categories 
     FROM "Artwork" WHERE embedding IS NULL`,
  )

  console.log(`Found ${artworks.length} artworks to embed.`)

  for (const artwork of artworks) {
    try {
      const text = [
        artwork.title,
        artwork.medium,
        artwork.collection,
        artwork.story,
        `Moods: ${(artwork.moods ?? []).join(', ')}`,
        `Colors: ${(artwork.colors ?? []).join(', ')}`,
        `Categories: ${(artwork.categories ?? []).join(', ')}`,
      ]
        .filter(Boolean)
        .join('\n')

      const response = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: [{ role: 'user', parts: [{ text }] }],
        config: {
          outputDimensionality: 768,
        },
      })

      const vector = response.embeddings[0].values

      await prisma.$executeRawUnsafe(
        `UPDATE "Artwork" SET embedding = $1::vector WHERE id = $2`,
        JSON.stringify(vector),
        artwork.id,
      )

      console.log(`✓ Embedded: ${artwork.title}`)
      await new Promise((r) => setTimeout(r, 200)) // API rate limit safeguard
    } catch (err) {
      console.error(`✗ Failed: ${artwork.title}`, err.message)
    }
  }
  console.log('Done.')
}

main().finally(() => prisma.$disconnect())
