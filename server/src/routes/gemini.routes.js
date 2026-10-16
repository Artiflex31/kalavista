import express from 'express'
import multer from 'multer'
import { GoogleGenAI, Type } from '@google/genai'
import requireAdmin from '../middleware/requireAdmin.js'

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 1,
  },
  fileFilter(req, file, callback) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(new Error('Only JPG, PNG, and WebP images are allowed.'))
    }

    callback(null, true)
  },
})

router.post(
  '/art-description',
  requireAdmin,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          success: false,
          message: 'GEMINI_API_KEY is not configured.',
        })
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please select an artwork image first.',
        })
      }

      const {
        title = '',
        medium = '',
        collection = '',
        moods = '',
        guidance = '',
      } = req.body ?? {}

      const prompt = `
You are an art-writing assistant for KalaVista.

Analyse the attached artwork image and the artist's notes.

ARTIST GUIDANCE:
${guidance || 'No additional guidance provided.'}

EXISTING TITLE:
${title || 'Not provided.'}

EXISTING MEDIUM:
${medium || 'Not provided.'}

EXISTING COLLECTION:
${collection || 'Not provided.'}

EXISTING MOODS:
${moods || 'Not provided.'}

Generate six separate fields:

1. title: A memorable, creative artwork title.
2. alt: A concise, accurate visual description under 250 characters.
3. story: An engaging art story of around 50–80 words.
4. medium: Preserve the supplied medium if present.
   Otherwise suggest a cautious estimate based on the image.
5. collection: A concise collection name matching the theme.
6. moods: Three to five short mood labels.

Use the image and notes together.
Do not invent the artist's biography or personal experiences.
Return JSON matching the required schema.
`

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      })

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: req.file.mimetype,
                  data: req.file.buffer.toString('base64'),
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              alt: { type: Type.STRING },
              story: { type: Type.STRING },
              medium: { type: Type.STRING },
              collection: { type: Type.STRING },
              moods: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              'title',
              'alt',
              'story',
              'medium',
              'collection',
              'moods',
            ],
          },
        },
      })

      if (!response.text) {
        throw new Error('Gemini returned an empty response.')
      }

      const generated = JSON.parse(response.text)

      const cleanText = (value, maxLength) =>
        typeof value === 'string' ? value.trim().slice(0, maxLength) : ''

      const generatedMoods = Array.isArray(generated.moods)
        ? generated.moods
            .filter((mood) => typeof mood === 'string')
            .map((mood) => mood.trim().slice(0, 40))
            .filter(Boolean)
            .slice(0, 5)
        : []

      return res.json({
        success: true,
        message: 'Artwork suggestions generated successfully.',
        data: {
          title: cleanText(generated.title, 150),
          alt: cleanText(generated.alt, 250),
          story: cleanText(generated.story, 2000),
          medium: cleanText(generated.medium, 150) || medium,
          collection: cleanText(generated.collection, 100) || collection,
          moods: generatedMoods,
        },
      })
    } catch (error) {
      console.error('[Gemini artwork generation]', error)

      return res.status(502).json({
        success: false,
        message:
          'AI generation failed. Check the backend terminal for details.',
      })
    }
  },
)

export default router
