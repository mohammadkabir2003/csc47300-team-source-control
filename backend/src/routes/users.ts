import express from 'express'
import { User } from '../models/User.js'
import { Product } from '../models/Product.js'
import { Review } from '../models/Review.js'
import { AppError } from '../middleware/errorHandler.js'

export const usersRouter = express.Router()

// Public: Get public user profile by id
usersRouter.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, isDeleted: false }).select('-password')

    if (!user) {
      throw new AppError('User not found', 404)
    }

    const [products, reviews] = await Promise.all([
      Product.find({ sellerId: req.params.id, isDeleted: false }).sort('-createdAt'),
      Review.find({ userId: req.params.id, deletedAt: { $exists: false } }).sort('-createdAt')
    ])

    res.json({
      success: true,
      data: {
        user,
        history: {
          products,
          reviews,
          totalProducts: products.length,
          totalReviews: reviews.length
        }
      }
    })
  } catch (error) {
    next(error)
  }
})

export default usersRouter
