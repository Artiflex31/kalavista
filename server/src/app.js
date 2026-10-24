// Trigger Railway deploy after security incident
import cors from 'cors'
import express from 'express'
import artworksRouter from './routes/artworks.routes.js'
import commissionEnquiriesRouter from './routes/commission-enquiries.routes.js'
import authRouter from './routes/auth.routes.js'
import ordersRouter from './routes/orders.routes.js'
import commissionPaymentsRouter from './routes/commission-payments.routes.js'
import commissionTrackingRouter from './routes/commission-tracking.routes.js'
import categoriesRouter from './routes/categories.routes.js'
import { handleRazorpayWebhook } from './routes/razorpay-webhook.routes.js'
import geminiRouter from './routes/gemini.routes.js'
import curatorRouter from './routes/curator.routes.js'
const app = express()

const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://kalavista-ashy.vercel.app', // ← your Vercel URL
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header (curl, server-to-server).
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin)) return callback(null, true)
      // Do not throw — just omit CORS headers.
      return callback(null, false)
    },
    credentials: true,
  }),
)
app.post(
  '/api/webhooks/razorpay',
  express.raw({ type: 'application/json' }),
  handleRazorpayWebhook,
)

app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.use('/api/artworks', artworksRouter)
app.use('/api/commission-enquiries', commissionEnquiriesRouter)
app.use('/api/auth', authRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/commission-payments', commissionPaymentsRouter)
app.use('/api/commission-tracking', commissionTrackingRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/ai', geminiRouter)
app.use('/api/curator', curatorRouter)
app.use((request, response) => {
  response.status(404).json({
    success: false,
    message: `Route ${request.method} ${request.originalUrl} was not found.`,
  })
})

app.use((error, req, res, next) => {
  console.error(error)

  res.status(500).json({
    success: false,
    message: 'Something went wrong on the server.',
  })
})

export default app
