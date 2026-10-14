import express from 'express'
import { GoogleGenAI } from '@google/genai'

const router = express.Router()

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

router.post('/art-description', async (req, res) => {
  try {
    const { title, medium, details } = req.body

    if (!title || typeof title !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Artwork title is required.',
      })
    }

    const prompt = `
      You are an art curator for KalaVista.

      Artwork title: ${title}
      Medium: ${medium || 'Not specified'}
      Details: ${details || 'Not specified'}

      Generate:
      1. A creative artwork title
      2. A short description
      3. A short story behind the artwork

      Keep it engaging and do not invent facts.
    `

    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
    })

    return res.json({
      success: true,
      description: result.text,
    })
  } catch (error) {
    console.error('Gemini API error details:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to generate artwork description.',
    })
  }
})

export default router
