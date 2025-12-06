import express from 'express'
import { User } from '../models/User.js'
import { generateToken } from '../utils/jwt.js'
import { AppError } from '../middleware/errorHandler.js'
import { authMiddleware } from '../middleware/auth.js'
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimiter.js'

export const authRouter = express.Router()

// Register
authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone, securityQuestion, securityAnswer } = req.body

    // Validation
    if (!email || !password || !firstName || !lastName) {
      throw new AppError('All fields are required', 400)
    }

    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400)
    }

    if (!securityAnswer || securityAnswer.trim().length < 2) {
      throw new AppError('Security answer must be at least 2 characters', 400)
    }

    // Check if ANY user exists with this email (active or deleted)
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    
    if (existingUser) {
      if (existingUser.isDeleted) {
        throw new AppError(
          'This email was previously registered to a deleted account. ' +
          'For security and data integrity reasons, we do not allow reusing emails from deleted accounts. ' +
          'Please use a different email address.',
          409
        )
      }
      throw new AppError('Email already registered', 409)
    }

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      phone,
      role: 'user',
      securityQuestion: securityQuestion || 'What is your favorite color?',
      securityAnswer,
    })

    await user.save()

    // Generate token
    const token = generateToken(user)

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    })
  } catch (error) {
    next(error)
  }
})

// Signup (alias for register)
authRouter.post('/signup', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone, securityQuestion, securityAnswer } = req.body

    // Validation
    if (!email || !password || !firstName || !lastName || !securityAnswer) {
      throw new AppError('Email, password, first name, last name, and security answer are required', 400)
    }

    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400)
    }

    // Check if ANY user exists with this email (active or deleted)
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    
    if (existingUser) {
      if (existingUser.isDeleted) {
        throw new AppError(
          'This email was previously registered to a deleted account. ' +
          'For security and data integrity reasons, we do not allow reusing emails from deleted accounts. ' +
          'Please use a different email address.',
          409
        )
      }
      throw new AppError('Email already registered', 409)
    }

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      phone,
      securityQuestion: securityQuestion || 'What is your favorite color?',
      securityAnswer,
      role: 'user',
    })

    await user.save()

    // Generate token
    const token = generateToken(user)

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    })
  } catch (error) {
    next(error)
  }
})

// Login
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      throw new AppError('Email and password are required', 400)
    }

    // Find user - exclude deleted users
    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } })
    if (!user) {
      throw new AppError('Invalid email or password', 401)
    }

    // Check if user is banned
    if (user.isBanned) {
      throw new AppError(`Account has been banned. Reason: ${user.banReason || 'Violation of terms'}`, 403)
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401)
    }

    // Generate token
    const token = generateToken(user)

    res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    })
  } catch (error) {
    next(error)
  }
})

// Get current user
authRouter.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user!

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    next(error)
  }
})

// Update profile
authRouter.put('/profile', authMiddleware, async (req, res, next) => {
  try {
    const { firstName, lastName, phone } = req.body
    const userId = req.user!._id

    const user = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, phone },
      { new: true, runValidators: true }
    ).select('-password')

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user!._id,
        email: user!.email,
        firstName: user!.firstName,
        lastName: user!.lastName,
        phone: user!.phone,
        role: user!.role,
      },
    })
  } catch (error) {
    next(error)
  }
})

// Change password
authRouter.put('/change-password', authMiddleware, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.user!._id

    if (!currentPassword || !newPassword) {
      throw new AppError('Current and new passwords are required', 400)
    }

    if (newPassword.length < 6) {
      throw new AppError('New password must be at least 6 characters', 400)
    }

    const user = await User.findById(userId)
    if (!user) {
      throw new AppError('User not found', 404)
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword)
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401)
    }

    // Update password
    user.password = newPassword
    await user.save()

    res.json({
      success: true,
      message: 'Password changed successfully',
    })
  } catch (error) {
    next(error)
  }
})

// Get security question for password reset
authRouter.post('/reset-password/question', passwordResetRateLimiter, async (req, res, next) => {
  try {
    const { email } = req.body

    if (!email) {
      throw new AppError('Email is required', 400)
    }

    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } })
    
    // Use generic error messages to prevent account enumeration
    if (!user || user.isBanned) {
      throw new AppError('Unable to reset password for this account', 404)
    }

    res.json({
      success: true,
      data: {
        securityQuestion: user.securityQuestion,
      },
    })
  } catch (error) {
    next(error)
  }
})

// Reset password with security answer
authRouter.post('/reset-password', passwordResetRateLimiter, async (req, res, next) => {
  try {
    const { email, securityAnswer, newPassword } = req.body

    if (!email || !securityAnswer || !newPassword) {
      throw new AppError('Email, security answer, and new password are required', 400)
    }

    if (newPassword.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400)
    }

    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } })

    // Use constant-time check to prevent timing attacks
    const isValidAnswer = user ? await user.compareSecurityAnswer(securityAnswer) : false
    
    // Prevent account enumeration and timing attacks with same error
    if (!user || user.isBanned || !isValidAnswer) {
      // Use generic error to prevent account enumeration
      throw new AppError('Invalid credentials or account cannot be reset', 401)
    }

    // Update password
    user.password = newPassword
    await user.save()

    res.json({
      success: true,
      message: 'Password reset successfully',
    })
  } catch (error) {
    next(error)
  }
})

// Logout (client-side only with JWT)
authRouter.post('/logout', async (_req, res, next) => {
  try {
    res.json({
      success: true,
      message: 'Logged out successfully',
    })
  } catch (error) {
    next(error)
  }
})

// Get session (check if token is valid)
authRouter.get('/session', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user!

    return res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    })
  } catch (error) {
    return next(error)
  }
})
