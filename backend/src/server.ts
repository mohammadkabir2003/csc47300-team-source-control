import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { connectDatabase } from './config/database.js'
import { initGridFS } from './config/gridfs.js'
import { authRouter } from './routes/auth.js'
import { productsRouter } from './routes/products.js'
import { cartRouter } from './routes/cart.js'
import { ordersRouter } from './routes/orders.js'
import { categoriesRouter } from './routes/categories.js'
import { adminRouter } from './routes/admin.js'
import { paymentsRouter } from './routes/payments.js'
import { uploadsRouter } from './routes/uploads.js'
import { reviewsRouter } from './routes/reviews.js'
import { disputesRouter } from './routes/disputes.js'
import { errorHandler } from './middleware/errorHandler.js'
import rateLimit from 'express-rate-limit'

dotenv.config()

// Connect to MongoDB and initialize GridFS
connectDatabase().then(() => {
  initGridFS()
})

const app = express()
const PORT = process.env.PORT || 5001

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
})
app.use('/api', limiter)

// Routes
app.use('/api/auth', authRouter)
app.use('/api/products', productsRouter)
app.use('/api/cart', cartRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/uploads', uploadsRouter)
app.use('/api/reviews', reviewsRouter)
app.use('/api/disputes', disputesRouter)
app.use('/api/admin', adminRouter)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📍 API available at http://localhost:${PORT}/api`)
})
