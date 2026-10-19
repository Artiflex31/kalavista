import { GoogleGenAI } from '@google/genai'

// text-embedding-004 retire ho chuka hai, ab gemini-embedding-001 use karenge
const MODEL = 'gemini-embedding-001'

let client = null

function getClient() {
  if (client) return client
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing in .env')
  client = new GoogleGenAI({ apiKey })
  return client
}

export async function createEmbedding(text) {
  const ai = getClient()
  const response = await ai.models.embedContent({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ text }] }],
    config: {
      outputDimensionality: 768, // DB me vector(768) hai isliye
    },
  })

  const values = response.embeddings?.[0]?.values
  if (!values || values.length !== 768) {
    throw new Error(
      `Unexpected embedding shape from Gemini: got ${values?.length} dims`,
    )
  }
  return values
}

export function buildArtworkEmbeddingText(artwork) {
  const parts = [
    artwork.title,
    artwork.medium,
    artwork.collection,
    artwork.story,
    `Moods: ${(artwork.moods ?? []).join(', ')}`,
    `Colors: ${(artwork.colors ?? []).join(', ')}`,
    `Categories: ${(artwork.categories ?? []).join(', ')}`,
  ].filter(Boolean)

  return parts.join('\n').slice(0, 8000)
}
