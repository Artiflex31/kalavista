import cors from 'cors'
import express from 'express'
import artworksRouter from './routes/artworks.routes.js'
import commissionEnquiriesRouter from './routes/commission-enquiries.routes.js'
import authRouter from './routes/auth.routes.js'
import ordersRouter from './routes/orders.routes.js'
import commissionPaymentsRouter from './routes/commission-payments.routes.js'
import commissionTrackingRouter from './routes/commission-tracking.routes.js'
import { handleRazorpayWebhook } from './routes/razorpay-webhook.routes.js'

const app = express()

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
  }),
)

/*
  This MUST stay before express.json().
  Razorpay signs the exact raw body, so parsed JSON would fail signature validation.
*/
app.post(
  '/api/webhooks/razorpay',
  express.raw({ type: 'application/json' }),
  handleRazorpayWebhook,
)

app.use(express.json())

app.use('/api/artworks', artworksRouter)
app.use('/api/commission-enquiries', commissionEnquiriesRouter)
app.use('/api/auth', authRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/commission-payments', commissionPaymentsRouter)
app.use('/api/commission-tracking', commissionTrackingRouter)

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
