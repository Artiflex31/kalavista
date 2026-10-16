import { Router } from 'express'
import multer from 'multer'
import { GoogleGenAI, Type, MediaResolution } from '@google/genai'
import requireAdmin from '../middleware/requireAdmin.js'

const router = Router()

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 1,
  },
  fileFilter(req, file, callback) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

    if (!allowedTypes.includes(file.mimetype)) {
      callback(new Error('Only JPG, PNG, and WebP images are allowed.'))
      return
    }

    callback(null, true)
  },
})

// Convert Multer errors into clear API responses.
function parseArtworkImage(req, res, next) {
  imageUpload.single('image')(req, res, (error) => {
    if (!error) {
      return next()
    }

    const message =
      error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
        ? 'Image must be 8 MB or smaller.'
        : error.message || 'Could not process the image.'

    return res.status(400).json({
      success: false,
      message,
    })
  })
}

function textValue(value, maxLength = 1000) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, maxLength)
}

router.post(
  '/art-description',
  requireAdmin,
  parseArtworkImage,
  async (req, res) => {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'GEMINI_API_KEY is not configured on the server.',
      })
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select an artwork image first.',
      })
    }

    const title = textValue(req.body.title, 150)
    const medium = textValue(req.body.medium, 150)
    const collection = textValue(req.body.collection, 100)
    const moods = textValue(req.body.moods, 300)
    const guidance = textValue(req.body.guidance, 1500)

    const prompt = `
You are an art-writing assistant for KalaVista,
an online art gallery.

Analyse the attached artwork image carefully.

Use the image's visible subjects, composition, colours,
textures, lighting and atmosphere. Also consider the
artist's guidance and existing form values below.

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

Generate all six fields:

1. title:
A memorable, tasteful artwork title, usually 2–8 words, include the original character/person name quality too if possible.

2. alt:
Accurate, concise visual description for screen-reader
users. Describe what can be seen, not the story behind it.
Keep it under 250 characters.

3. story:
An engaging, natural art story inspired by the image and
the artist's guidance. Aim for approximately 50–80 words. Be concise, natural,
and specific to the artwork. Do not invent the artist's biography, real events or
personal experiences that were not supplied. it should be focused on why did i draw this artwork!

4. medium:
If an existing medium is supplied, preserve its meaning
because the image cannot prove the exact materials.
If it is blank, provide a cautious visual estimate.
If uncertain, start the estimate with "Likely:".

5. collection:
Suggest a concise, suitable collection name based on
the artwork's theme. Keep it under 100 characters.

6. moods:
Return 3–5 short mood labels that fit the artwork.
Avoid sentences. Each label should be under 40 characters.

The existing values are hints, not mandatory output.
Improve the title, description, story, collection and moods
when appropriate. Use the artist's guidance as creative
context, but keep visual descriptions faithful to the image.

Return only data matching the required JSON schema.
`

    try {
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
          // Faster generation with less internal reasoning.
          thinkingConfig: {
            thinkingLevel: 'LOW',
          },

          // Lower image-processing overhead than the default resolution.
          mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
              },
              alt: {
                type: Type.STRING,
              },
              story: {
                type: Type.STRING,
              },
              medium: {
                type: Type.STRING,
              },
              collection: {
                type: Type.STRING,
              },
              moods: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
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

      const asText = (value, maxLength) =>
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
          title: asText(generated.title, 150),
          alt: asText(generated.alt, 250),
          story: asText(generated.story, 2000),
          medium: asText(generated.medium, 150),
          collection: asText(generated.collection, 100),
          moods: generatedMoods,
        },
      })
    } catch (error) {
      console.error('[AI artwork description]', error)

      return res.status(502).json({
        success: false,
        message:
          'AI generation failed. Check the server API key, model access, and quota, then try again.',
      })
    }
  },
)

export default router
