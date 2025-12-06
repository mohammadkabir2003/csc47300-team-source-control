import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'
import { User } from '../models/User'
import { AppError } from './errorHandler.js'

export interface AuthRequest extends Request {
  user?: any
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No authorization token provided', 401)
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded) {
      throw new AppError('Invalid or expired token', 401)
    }

    const user = await User.findById(decoded.userId).select('-password')

    if (!user) {
      throw new AppError('User not found', 404)
    }

    // Check if user is deleted
    if (user.isDeleted) {
      throw new AppError('Account has been deleted', 403)
    }

    // Check if user is banned
    if (user.isBanned) {
      throw new AppError(`Account has been banned. Reason: ${user.banReason || 'Violation of terms'}`, 403)
    }

    req.user = user
    next()
  } catch (error: any) {
    next(error)
  }
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401)
    }

    if (req.user.role !== 'admin1' && req.user.role !== 'admin2') {
      throw new AppError('Admin access required', 403)
    }

    next()
  } catch (error: any) {
    next(error)
  }
}

export async function requireAdmin2(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401)
    }

    if (req.user.role !== 'admin2') {
      throw new AppError('Admin2 access required - only Admin2 can perform this action', 403)
    }

    next()
  } catch (error: any) {
    next(error)
  }
}
