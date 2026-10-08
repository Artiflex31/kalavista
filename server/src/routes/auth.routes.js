import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import requireAdmin from '../middleware/requireAdmin.js'

const router = Router()

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
})

router.post('/login', async (req, res, next) => {
  try {
    const result = loginSchema.safeParse(req.body)

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Please check your email and password.',
        errors: result.error.flatten().fieldErrors,
      })
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is missing in server/.env.')
    }

    const email = result.data.email.toLowerCase()

    const admin = await prisma.adminUser.findUnique({
      where: { email },
    })

    const passwordMatches =
      admin && (await bcrypt.compare(result.data.password, admin.passwordHash))

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      })
    }

    const token = jwt.sign(
      {
        sub: admin.id,
        email: admin.email,
        role: admin.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '8h',
      },
    )

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
        },
      },
    })
  } catch (error) {
    next(error)
  }
})

router.get('/me', requireAdmin, (req, res) => {
  res.json({
    success: true,
    data: {
      admin: req.admin,
    },
  })
})

export default router
