import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import requireAdmin from '../middleware/requireAdmin.js'
import multer from 'multer'
import cloudinary from '../lib/cloudinary.js'

const router = Router()
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.mimetype)) {
      callback(new Error('Only JPG, PNG, and WebP images are allowed.'))
      return
    }
    callback(null, true)
  },
})

function uploadCategoryImage(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'kalavista/categories',
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto',
      },
      (error, result) => {
        if (error) return reject(error)
        resolve(result)
      },
    )
    stream.end(buffer)
  })
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const createCategorySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(
      slugPattern,
      'Slug must use lowercase letters, numbers, and hyphens.',
    ),
  label: z.string().trim().min(2).max(80),
  accent: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Accent must be a hex colour like #9c4135.')
    .default('#9c4135'),
  imageUrl: z.string().trim().url().optional().or(z.literal('')),
  alt: z.string().trim().max(250).optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
})

const updateCategorySchema = createCategorySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Send at least one field to update.',
  })

/* Public: list all categories for the gallery conveyor and admin dropdown. */
router.get('/', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    })

    res.json({
      success: true,
      count: categories.length,
      data: categories,
    })
  } catch (error) {
    next(error)
  }
})
/* Protected: upload a category cover image. */
router.post(
  '/upload',
  requireAdmin,
  imageUpload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Choose a category image first.',
        })
      }

      const result = await uploadCategoryImage(req.file.buffer)

      res.status(201).json({
        success: true,
        message: 'Category image uploaded.',
        data: {
          imageUrl: result.secure_url,
          publicId: result.public_id,
        },
      })
    } catch (error) {
      next(error)
    }
  },
)
/* Protected: create a category. */
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const parsed = createCategorySchema.safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Please check the category fields.',
        errors: parsed.error.flatten().fieldErrors,
      })
    }

    const { slug, label, accent, imageUrl, alt, sortOrder } = parsed.data

    const duplicate = await prisma.category.findFirst({
      where: { OR: [{ slug }, { label }] },
      select: { id: true, slug: true, label: true },
    })

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `A category with slug "${duplicate.slug}" or label "${duplicate.label}" already exists.`,
      })
    }

    const category = await prisma.category.create({
      data: {
        slug,
        label,
        accent,
        imageUrl: imageUrl || null,
        alt: alt || null,
        sortOrder,
      },
    })

    res.status(201).json({
      success: true,
      message: `Category "${category.label}" created.`,
      data: category,
    })
  } catch (error) {
    next(error)
  }
})

/* Protected: update label, accent, image, sort order. */
router.patch('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category id.',
      })
    }

    const parsed = updateCategorySchema.safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Please check the category fields.',
        errors: parsed.error.flatten().fieldErrors,
      })
    }

    const data = { ...parsed.data }
    if (data.imageUrl !== undefined) data.imageUrl = data.imageUrl || null
    if (data.alt !== undefined) data.alt = data.alt || null

    const category = await prisma.category.update({
      where: { id },
      data,
    })

    res.json({
      success: true,
      message: `Category "${category.label}" updated.`,
      data: category,
    })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      })
    }
    next(error)
  }
})

/* Protected: delete a category. Refuses if artworks still use it. */
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category id.',
      })
    }

    const category = await prisma.category.findUnique({ where: { id } })

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      })
    }

    const artworksUsing = await prisma.artwork.count({
      where: { categories: { has: category.slug } },
    })

    if (artworksUsing > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete "${category.label}" while ${artworksUsing} artwork(s) still use it. Reassign them first.`,
      })
    }

    await prisma.category.delete({ where: { id } })

    res.json({
      success: true,
      message: `Category "${category.label}" deleted.`,
    })
  } catch (error) {
    next(error)
  }
})

export default router
