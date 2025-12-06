import { Request, Response, NextFunction } from 'express'
import { AppError } from './errorHandler.js'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 5 * 60 * 1000)

export const createRateLimiter = (options: {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  message?: string
  keyGenerator?: (req: Request) => string
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = options.keyGenerator 
      ? options.keyGenerator(req)
      : req.ip || req.socket.remoteAddress || 'unknown'
    
    const now = Date.now()
    const record = store[key]

    if (!record || record.resetTime < now) {
      // Create new record
      store[key] = {
        count: 1,
        resetTime: now + options.windowMs
      }
      return next()
    }

    if (record.count >= options.maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000)
      res.setHeader('Retry-After', retryAfter)
      throw new AppError(
        options.message || 'Too many requests, please try again later',
        429
      )
    }

    record.count++
    next()
  }
}

// Specific rate limiters for different endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts. Please try again in 15 minutes.'
})

export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 attempts per hour
  message: 'Too many password reset attempts. Please try again in 1 hour.',
  keyGenerator: (req) => {
    // Rate limit by email to prevent enumeration
    const email = req.body.email
    return email ? `reset:${email.toLowerCase()}` : req.ip || 'unknown'
  }
})

export const orderCreationRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 3, // 3 orders per minute
  message: 'Too many order attempts. Please wait before creating another order.'
})

export const reviewRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 reviews per minute
  message: 'Too many review submissions. Please wait before submitting another review.'
})
