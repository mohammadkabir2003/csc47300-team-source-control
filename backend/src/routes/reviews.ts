import express from 'express'
import { Review } from '../models/Review.js'
import { Product } from '../models/Product.js'
import { Order } from '../models/Order.js'
import { User } from '../models/User.js'
import { AppError } from '../middleware/errorHandler.js'
import { authMiddleware } from '../middleware/auth.js'
import { reviewRateLimiter } from '../middleware/rateLimiter.js'

export const reviewsRouter = express.Router()

reviewsRouter.get('/product/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params
    const reviews = await Review.find({ productId, isDeleted: { $ne: true } })
      .populate('userId', 'firstName lastName isBanned isDeleted')
      .sort('-createdAt')
      .lean()

    const visibleReviews = reviews.filter(review => {
      const user = review.userId as any
      if (user?.isDeleted) {
        return false
      }
      return true
    })

    const reviewsWithStatus = visibleReviews.map(review => {
      const user = review.userId as any
      return {
        ...review,
        userBanned: user?.isBanned || false
      }
    })

    res.json({
      success: true,
      data: reviewsWithStatus,
    })
  } catch (error) {
    next(error)
  }
})

// Get reviews written by a user (authenticated). Use 'me' to refer to current user.
reviewsRouter.get('/user/:userId', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.params
    const viewer = req.user!
    const targetId = userId === 'me' ? viewer._id : userId

    const reviews = await Review.find({ userId: targetId, isDeleted: { $ne: true } })
      .populate('productId', 'name images price')
      .sort('-createdAt')
      .lean()

    res.json({ success: true, data: reviews })
  } catch (error) {
    next(error)
  }
})

reviewsRouter.get('/can-review/:productId', authMiddleware, async (req, res, next) => {
  try {
    const { productId } = req.params
    const user = req.user!

    const product = await Product.findById(productId)
    if (!product) {
      res.json({ success: true, canReview: false, reason: 'Product not found' })
      return
    }

    if (product.sellerId.toString() === user._id.toString()) {
      res.json({ success: true, canReview: false, reason: 'own_product' })
      return
    }

    const existingReview = await Review.findOne({ productId, userId: user._id })
    if (existingReview) {
      res.json({ success: true, canReview: false, reason: 'already_reviewed' })
      return
    }

    const completedOrder = await Order.findOne({
      userId: user._id,
      'items.productId': productId,
      buyerConfirmed: true,
      sellerConfirmed: true,
      isDeleted: false,
    })

    if (!completedOrder) {
      res.json({ success: true, canReview: false, reason: 'not_received' })
      return
    }

    res.json({ success: true, canReview: true })
  } catch (error) {
    next(error)
  }
})

reviewsRouter.post('/', authMiddleware, reviewRateLimiter, async (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body
    const user = req.user!

    if (!productId || !rating || !comment) {
      throw new AppError('Product ID, rating, and comment are required', 400)
    }

    if (rating < 1 || rating > 5) {
      throw new AppError('Rating must be between 1 and 5', 400)
    }

    const product = await Product.findById(productId)
    if (!product) {
      throw new AppError('Product not found', 404)
    }

    if (product.sellerId.toString() === user._id.toString()) {
      throw new AppError('You cannot review your own product', 403)
    }

    const existingReview = await Review.findOne({ productId, userId: user._id })
    if (existingReview) {
      if (existingReview.isDeleted) {
        throw new AppError('You previously deleted your review. Contact admin to review again.', 400)
      }
      throw new AppError('You have already reviewed this product', 400)
    }

    const completedOrder = await Order.findOne({
      userId: user._id,
      'items.productId': productId,
      buyerConfirmed: true,
      sellerConfirmed: true,
      isDeleted: false,
    })

    if (!completedOrder) {
      throw new AppError('You can only review products you have purchased and received', 403)
    }

    const review = new Review({
      productId,
      userId: user._id,
      userName: `${user.firstName} ${user.lastName}`,
      rating,
      comment,
      isVerifiedPurchase: true,
    })

    await review.save()

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: review,
    })
  } catch (error) {
    next(error)
  }
})

reviewsRouter.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params
    const { rating, comment } = req.body
    const user = req.user!

    const review = await Review.findOne({ _id: id, isDeleted: { $ne: true } })
    
    if (!review) {
      throw new AppError('Review not found', 404)
    }

    if (review.userId.toString() !== user._id.toString()) {
      throw new AppError('Not authorized to update this review', 403)
    }

    if (rating) {
      if (rating < 1 || rating > 5) {
        throw new AppError('Rating must be between 1 and 5', 400)
      }
      review.rating = rating
    }

    if (comment) {
      review.comment = comment
    }

    await review.save()

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: review,
    })
  } catch (error) {
    next(error)
  }
})

reviewsRouter.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params
    const user = req.user!

    const review = await Review.findOne({ _id: id, isDeleted: { $ne: true } })
    
    if (!review) {
      throw new AppError('Review not found', 404)
    }

    if (review.userId.toString() !== user._id.toString() && user.role !== 'admin2') {
      throw new AppError('Not authorized to delete this review', 403)
    }

    review.isDeleted = true
    review.deletedAt = new Date()
    review.deletedBy = user._id
    await review.save()

    res.json({
      success: true,
      message: 'Review deleted successfully',
    })
  } catch (error) {
    next(error)
  }
})
