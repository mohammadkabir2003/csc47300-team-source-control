import express from 'express'
import { Review } from '../models/Review.js'
import { Product } from '../models/Product.js'
import { Order } from '../models/Order.js'
import { User } from '../models/User.js'
import { AppError } from '../middleware/errorHandler.js'
import { authMiddleware } from '../middleware/auth.js'
import { reviewRateLimiter } from '../middleware/rateLimiter.js'

export const reviewsRouter = express.Router()

// Get reviews for a product
reviewsRouter.get('/product/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params
    
    // Get reviews (exclude deleted reviews)
    const reviews = await Review.find({ productId, isDeleted: { $ne: true } })
      .populate('userId', 'firstName lastName isBanned isDeleted')
      .sort('-createdAt')
      .lean()

    // Filter out reviews where user is deleted (but keep banned users)
    const visibleReviews = reviews.filter(review => {
      const user = review.userId as any
      // Exclude if user is deleted
      if (user?.isDeleted) {
        return false
      }
      return true
    })

    // Add userBanned flag to reviews from banned users
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

// Check if user can review a product
reviewsRouter.get('/can-review/:productId', authMiddleware, async (req, res, next) => {
  try {
    const { productId } = req.params
    const user = req.user!

    // Check if product exists
    const product = await Product.findById(productId)
    if (!product) {
      res.json({ success: true, canReview: false, reason: 'Product not found' })
      return
    }

    // Can't review own product
    if (product.sellerId.toString() === user._id.toString()) {
      res.json({ success: true, canReview: false, reason: 'own_product' })
      return
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({ productId, userId: user._id })
    if (existingReview) {
      res.json({ success: true, canReview: false, reason: 'already_reviewed' })
      return
    }

    // Check if user has a completed order (both confirmed, not deleted) with this product
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

// Create a review (authenticated)
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

    // Check if product exists
    const product = await Product.findById(productId)
    if (!product) {
      throw new AppError('Product not found', 404)
    }

    // Prevent seller from reviewing their own product
    if (product.sellerId.toString() === user._id.toString()) {
      throw new AppError('You cannot review your own product', 403)
    }

    // Check if user already reviewed this product (including deleted reviews to prevent bombing)
    const existingReview = await Review.findOne({ productId, userId: user._id })
    if (existingReview) {
      if (existingReview.isDeleted) {
        throw new AppError('You previously deleted your review. Contact admin to review again.', 400)
      }
      throw new AppError('You have already reviewed this product', 400)
    }

    // Check if user has completed order with this product (both buyer and seller confirmed, not deleted)
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

// Update review (authenticated, own reviews only)
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

// Delete review (authenticated, own reviews only)
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
