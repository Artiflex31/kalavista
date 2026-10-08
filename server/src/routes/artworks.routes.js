import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import requireAdmin from '../middleware/requireAdmin.js'
import multer from 'multer'
import cloudinary from '../lib/cloudinary.js'

const router = Router()
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
  fileFilter(req, file, callback) {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']

    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(new Error('Only JPG, PNG, and WebP images are allowed.'))
      return
    }

    callback(null, true)
  },
})

function uploadArtworkImage(buffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'kalavista/artworks',
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto',
      },
      (error, result) => {
        if (error) {
          reject(error)
          return
        }

        resolve(result)
      },
    )

    uploadStream.end(buffer)
  })
}

const artworkSchema = z.object({
  title: z.string().trim().min(2, 'Title must contain at least 2 characters.'),
  medium: z
    .string()
    .trim()
    .min(2, 'Medium must contain at least 2 characters.'),
  year: z.coerce
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1),
  dimensions: z.string().trim().max(100).optional(),
  collection: z.string().trim().max(100).optional(),
  moods: z.array(z.string().trim().min(1).max(40)).default([]),
  categories: z.array(z.string().trim().min(1).max(60)).default([]),
  availability: z
    .enum(['AVAILABLE', 'RESERVED', 'SOLD', 'NOT_FOR_SALE'])
    .default('AVAILABLE'),
  priceInPaise: z.coerce.number().int().min(0).nullable().optional(),
  currency: z.string().trim().length(3).default('INR'),
  imageUrl: z.string().trim().url().optional().or(z.literal('')),
  alt: z.string().trim().max(250).optional(),
  story: z
    .string()
    .trim()
    .min(10, 'Artwork story must contain at least 10 characters.')
    .max(2000),
  isFeatured: z.boolean().default(false),
})
const artworkUpdateSchema = artworkSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Send at least one artwork field to update.',
  })

function createSlug(title) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'untitled-artwork'
  )
}

async function createUniqueSlug(title) {
  const baseSlug = createSlug(title)
  let slug = baseSlug
  let suffix = 2

  while (await prisma.artwork.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  return slug
}
/*
  Protected:
  Upload one local artwork image to Cloudinary.
*/
router.post(
  '/upload',
  requireAdmin,
  imageUpload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Choose an artwork image first.',
        })
      }

      const uploadResult = await uploadArtworkImage(req.file.buffer)

      res.status(201).json({
        success: true,
        message: 'Image uploaded successfully.',
        data: {
          imageUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          width: uploadResult.width,
          height: uploadResult.height,
          format: uploadResult.format,
        },
      })
    } catch (error) {
      next(error)
    }
  },
)
/*
  Protected: update one artwork from the Studio dashboard.
  The slug stays unchanged so existing artwork links do not break.
*/
router.patch('/:id', requireAdmin, async (req, res, next) => {
  try {
    const artworkId = Number(req.params.id)

    if (!Number.isInteger(artworkId) || artworkId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid artwork id.',
      })
    }

    const result = artworkUpdateSchema.safeParse(req.body)

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Please check the artwork fields.',
        errors: result.error.flatten().fieldErrors,
      })
    }

    const existingArtwork = await prisma.artwork.findUnique({
      where: { id: artworkId },
      select: {
        id: true,
        title: true,
      },
    })

    if (!existingArtwork) {
      return res.status(404).json({
        success: false,
        message: 'Artwork not found.',
      })
    }

    const data = result.data

    const updateData = {
      ...data,

      // Empty optional fields become null in PostgreSQL.
      dimensions:
        data.dimensions === undefined ? undefined : data.dimensions || null,

      collection:
        data.collection === undefined ? undefined : data.collection || null,

      imageUrl: data.imageUrl === undefined ? undefined : data.imageUrl || null,

      alt: data.alt === undefined ? undefined : data.alt || null,

      // Keep the stored currency consistent, for example "INR".
      currency: data.currency ? data.currency.toUpperCase() : undefined,
    }

    const artwork = await prisma.artwork.update({
      where: { id: artworkId },
      data: updateData,
    })

    return res.json({
      success: true,
      message: `"${artwork.title}" was updated successfully.`,
      data: artwork,
    })
  } catch (error) {
    next(error)
  }
})
/*
  Public: list artworks.
  Optional example: /api/artworks?collection=Monsoon%20Studies
*/
router.get('/', async (req, res, next) => {
  try {
    const collection = req.query.collection

    const artworks = await prisma.artwork.findMany({
      where: collection ? { collection } : undefined,
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json({
      success: true,
      count: artworks.length,
      data: artworks,
    })
  } catch (error) {
    next(error)
  }
})

/*
  Protected: create one artwork.
*/
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const result = artworkSchema.safeParse(req.body)

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Please check the artwork fields.',
        errors: result.error.flatten().fieldErrors,
      })
    }

    const data = result.data
    const slug = await createUniqueSlug(data.title)

    const artwork = await prisma.artwork.create({
      data: {
        slug,
        title: data.title,
        medium: data.medium,
        year: data.year,
        dimensions: data.dimensions || null,
        collection: data.collection || null,
        moods: data.moods,
        categories: data.categories,
        availability: data.availability,
        priceInPaise: data.priceInPaise ?? null,
        currency: data.currency.toUpperCase(),
        imageUrl: data.imageUrl || null,
        alt: data.alt || null,
        story: data.story,
        isFeatured: data.isFeatured,
      },
    })

    res.status(201).json({
      success: true,
      message: 'Artwork created successfully.',
      data: artwork,
    })
  } catch (error) {
    next(error)
  }
})
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const artworkId = Number(req.params.id)

    if (!Number.isInteger(artworkId) || artworkId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid artwork id.',
      })
    }

    const artwork = await prisma.artwork.findUnique({
      where: { id: artworkId },
      select: {
        id: true,
        title: true,
      },
    })

    if (!artwork) {
      return res.status(404).json({
        success: false,
        message: 'Artwork not found.',
      })
    }

    await prisma.artwork.delete({
      where: { id: artworkId },
    })

    return res.json({
      success: true,
      message: `"${artwork.title}" was removed from KalaVista.`,
    })
  } catch (error) {
    next(error)
  }
})

/*
  Public: read one artwork by its stable URL slug.
*/
router.get('/:slug', async (req, res, next) => {
  try {
    const artwork = await prisma.artwork.findUnique({
      where: {
        slug: req.params.slug,
      },
    })

    if (!artwork) {
      return res.status(404).json({
        success: false,
        message: 'Artwork not found.',
      })
    }

    res.json({
      success: true,
      data: artwork,
    })
  } catch (error) {
    next(error)
  }
})

export default router
