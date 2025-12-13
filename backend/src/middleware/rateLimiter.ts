import { Request, Response, NextFunction } from 'express'
import { AppError } from './errorHandler.js'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 5 * 60 * 1000)

export const createRateLimiter = (options: {
  windowMs: number
  maxRequests: number
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

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many authentication attempts. Please try again in 15 minutes.'
})

export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 3,
  message: 'Too many password reset attempts. Please try again in 1 hour.',
  keyGenerator: (req) => {
    const email = req.body.email
    return email ? `reset:${email.toLowerCase()}` : req.ip || 'unknown'
  }
})

export const orderCreationRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 3,
  message: 'Too many order attempts. Please wait before creating another order.'
})

export const reviewRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
  message: 'Too many review submissions. Please wait before submitting another review.'
})
