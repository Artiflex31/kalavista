import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { createEmbedding } from '../lib/embeddings.js'
import { GoogleGenAI } from '@google/genai'

const router = Router()

router.post('/search', async (req, res, next) => {
  try {
    const query = String(req.body?.query ?? '').trim()

    if (query.length < 3) {
      return res
        .status(400)
        .json({ success: false, message: 'Please write a longer query.' })
    }

    // 1. Vector search for artworks
    const queryVector = await createEmbedding(query)
    const results = await prisma.$queryRawUnsafe(
      `
        SELECT 
          id, slug, title, "imageUrl", medium, moods, colors, availability,
          1 - (embedding <=> $1::vector) AS similarity
        FROM "Artwork"
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT 4
      `,
      JSON.stringify(queryVector),
    )

    // Filter out weak matches
    const matches = results.filter((r) => r.similarity >= 0.55)

    // 2. Prepare prompt for LLM (Gemini)
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    // 1. Artworks ko Markdown Link format me taiyar karo
    const artworkContext =
      matches.length > 0
        ? matches
            .map(
              (a) =>
                `- [${a.title}](/artworks/${a.slug}) (${a.medium}, moods: ${a.moods?.join(', ')})`,
            )
            .join('\n')
        : 'No artworks matched this query.'

    const prompt = `
      You are "Kala", the AI assistant for KalaVista (an art studio and gallery).
      
      USER QUERY: "${query}"
      
      MATCHING ARTWORKS IN CATALOGUE:
      ${artworkContext}
      
      SITE KNOWLEDGE:
      - Order Tracking: Users can track their artwork orders at /order-status/{reference}. They receive this link in their email.
      - Commission Tracking: Custom commissions can be tracked at /commission-status/{trackingReference}.
      - Payments: Handled via Razorpay. We do not store card details.
      - Custom Commissions: Users can request a custom artwork at /commissions.
      
      INSTRUCTIONS:
      1. If the user is looking for art, suggest the matching artworks in a friendly way.
      2. If the user is asking a general question, answer it using the SITE KNOWLEDGE.
      3. Keep the response under 4 sentences. Be polite, artistic, and helpful.
      4. CRITICAL RULE: You must ONLY talk about the artworks listed in the "MATCHING ARTWORKS IN CATALOGUE" section above. NEVER invent or recall any other artwork. If the list says "No artworks matched", politely say you couldn't find anything and suggest exploring the gallery.
      5. Do NOT use asterisks (*) or bold text (**). Just use plain text and the provided links.
    `
    let response
    try {
      // Request me ek timeout set karo taaki infinite wait na ho
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      })
    } catch (error) {
      console.error('[Gemini LLM Error]', error.message)
      // Agar network error hai, toh ek friendly message bhejo
      return res.json({
        success: true,
        answer:
          "I'm having a little trouble connecting to my creative brain right now. Please try your search again in a moment.",
        data: matches,
      })
    }

    res.json({
      success: true,
      answer: response.text, // <-- LLM's conversational answer
      data: matches, // <-- Artwork cards for the UI
    })
  } catch (error) {
    next(error)
  }
})

export default router
