import express from 'express'
import { User } from '../models/User.js'
import { Product } from '../models/Product.js'
import { Order } from '../models/Order.js'
import { Category } from '../models/Category.js'
import { Coupon } from '../models/Coupon.js'
import { Review } from '../models/Review.js'
import { Message } from '../models/Message.js'
import { Cart } from '../models/Cart.js'
import { Payment } from '../models/Payment.js'
import { AppError } from '../middleware/errorHandler.js'
import { authMiddleware, requireAdmin, requireAdmin2 } from '../middleware/auth.js'
import { generateToken } from '../utils/jwt.js'

export const adminRouter = express.Router()
adminRouter.use(authMiddleware, requireAdmin)

adminRouter.post('/create-admin', requireAdmin2, async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role } = req.body

    if (!email || !password || !firstName || !lastName || !role) {
      throw new AppError('All fields are required', 400)
    }

    if (role !== 'admin1' && role !== 'admin2') {
      throw new AppError('Role must be admin1 or admin2', 400)
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() })
    
    if (existingUser) {
      if (existingUser.isDeleted) {
        throw new AppError(
          `This email belongs to a deleted account (${existingUser.firstName} ${existingUser.lastName}, ${existingUser.role}). ` +
          `Cannot create new admin with this email. ` +
          `Please restore the deleted user first, then promote them to ${role} if needed. ` +
          `Alternatively, use a different email address.`,
          409
        )
      }
      throw new AppError('Email already registered', 409)
    }

    const adminUser = new User({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      role,
      isEmailVerified: true,
    })

    await adminUser.save()

    res.status(201).json({
      success: true,
      message: `${role} user created successfully`,
      data: {
        id: adminUser._id,
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        role: adminUser.role,
      },
    })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/admins', requireAdmin2, async (req, res, next) => {
  try {
    const { includeDeleted } = req.query

    const query: any = { role: { $in: ['admin1', 'admin2'] } }
    
    if (includeDeleted !== 'true') {
      query.isDeleted = false
    }

    const admins = await User.find(query).select('-password').sort('-createdAt')

    res.json({ success: true, data: admins })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role, includeDeleted } = req.query

    const query: any = {}
    
    if (req.user!.role === 'admin2' && includeDeleted === 'true') {
    } else {
      query.isDeleted = false
    }

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ]
    }
    if (role) query.role = role

    const skip = (Number(page) - 1) * Number(limit)

    const [users, total] = await Promise.all([
      User.find(query).select('-password').sort('-createdAt').skip(skip).limit(Number(limit)),
      User.countDocuments(query),
    ])

    res.json({
      success: true,
      data: users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/users/:id', async (req, res, next) => {
  try {
    const query: any = { _id: req.params.id }
    
    if (req.user!.role !== 'admin2') {
      query.isDeleted = false
    }

    const user = await User.findOne(query).select('-password')
    
    if (!user) {
      throw new AppError('User not found', 404)
    }

    const [products, orders, reviews] = await Promise.all([
      Product.find({ sellerId: req.params.id, ...(req.user!.role !== 'admin2' ? { isDeleted: false } : {}) }).sort('-createdAt'),
      Order.find({ userId: req.params.id, ...(req.user!.role !== 'admin2' ? { isDeleted: false } : {}) }).sort('-createdAt'),
      Review.find({ userId: req.params.id, ...(req.user!.role !== 'admin2' ? { isDeleted: { $ne: true } } : {}) }).sort('-createdAt'),
    ])

    res.json({ 
      success: true, 
      data: {
        user,
        history: {
          products,
          orders,
          reviews,
          totalProducts: products.length,
          totalOrders: orders.length,
          totalReviews: reviews.length,
          totalSpent: orders.reduce((sum, order) => sum + parseFloat(order.totalAmount || '0'), 0).toFixed(2),
        }
      }
    })
  } catch (error) {
    next(error)
  }
})

adminRouter.put('/users/:id', async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, role, isEmailVerified } = req.body

    const user = await User.findOne({ _id: req.params.id, isDeleted: false })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    // Only Admin2 can change roles (including promoting to admin1 or admin2)
    if (role && req.user!.role !== 'admin2') {
      throw new AppError('Only Admin2 can change user roles', 403)
    }

    // Validate role if provided
    if (role && req.user!.role === 'admin2') {
      const validRoles = ['user', 'admin1', 'admin2']
      if (!validRoles.includes(role)) {
        throw new AppError('Invalid role. Must be: user, admin1, or admin2', 400)
      }
      user.role = role
    }

    // Only update fields that are provided
    if (firstName !== undefined) user.firstName = firstName
    if (lastName !== undefined) user.lastName = lastName
    if (email !== undefined) user.email = email
    if (phone !== undefined) user.phone = phone
    if (isEmailVerified !== undefined) user.isEmailVerified = isEmailVerified

    await user.save()

    res.json({ 
      success: true, 
      message: `User updated${role ? ` and promoted to ${role}` : ''}`, 
      data: await User.findById(user._id).select('-password')
    })
  } catch (error) {
    next(error)
  }
})

// Soft delete user (Admin2 only)
adminRouter.delete('/users/:id', requireAdmin2, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      throw new AppError('User not found', 404)
    }

    if (user.isDeleted) {
      throw new AppError('User already deleted', 400)
    }

    user.isDeleted = true
    user.deletedAt = new Date()
    user.deletedBy = req.user!._id
    await user.save()

    // Soft delete related data
    await Promise.all([
      Product.updateMany(
        { sellerId: req.params.id, isDeleted: false },
        { isDeleted: true, deletedAt: new Date(), deletedBy: req.user!._id }
      ),
      Order.updateMany(
        { userId: req.params.id, isDeleted: false },
        { isDeleted: true, deletedAt: new Date(), deletedBy: req.user!._id }
      ),
    ])

    res.json({ success: true, message: 'User soft deleted' })
  } catch (error) {
    next(error)
  }
})

// Restore deleted user (Admin2 only)
adminRouter.post('/users/:id/restore', requireAdmin2, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      throw new AppError('User not found', 404)
    }

    if (!user.isDeleted) {
      throw new AppError('User is not deleted', 400)
    }
    
    // CRITICAL: Check if email is now used by another ACTIVE user
    const activeUserWithEmail = await User.findOne({ 
      email: user.email, 
      isDeleted: false,
      _id: { $ne: user._id } // Different user
    })
    
    if (activeUserWithEmail) {
      throw new AppError(
        `Cannot restore user. Email "${user.email}" is now registered to another active account (${activeUserWithEmail.firstName} ${activeUserWithEmail.lastName}). ` +
        `This is a logical conflict - you cannot have duplicate emails. ` +
        `Either delete the current account or contact the user to use a different email.`,
        409
      )
    }

    // Store deletedBy before clearing it so we can restore related data
    const deletedBy = user.deletedBy

    user.isDeleted = false
    user.deletedAt = undefined
    user.deletedBy = undefined
    await user.save()

    // Restore user's products and orders that were deleted with the user
    if (deletedBy) {
      await Promise.all([
        Product.updateMany(
          { sellerId: req.params.id, deletedBy: deletedBy },
          { isDeleted: false, deletedAt: undefined, deletedBy: undefined }
        ),
        Order.updateMany(
          { userId: req.params.id, deletedBy: deletedBy },
          { isDeleted: false, deletedAt: undefined, deletedBy: undefined }
        ),
      ])
    }

    res.json({ success: true, message: 'User and their data restored' })
  } catch (error) {
    next(error)
  }
})

// Ban user (Admin1 and Admin2)
adminRouter.post('/users/:id/ban', async (req, res, next) => {
  try {
    const { reason } = req.body
    const user = await User.findOne({ _id: req.params.id, isDeleted: false })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    if (user.isBanned) {
      throw new AppError('User is already banned', 400)
    }

    // Prevent banning yourself
    if (user._id.toString() === req.user!._id.toString()) {
      throw new AppError('Cannot ban yourself', 403)
    }

    user.isBanned = true
    user.bannedAt = new Date()
    user.bannedBy = req.user!._id
    user.banReason = reason || 'Violation of terms and conditions'
    await user.save()

    res.json({ 
      success: true, 
      message: 'User banned successfully',
      data: await User.findById(user._id).select('-password')
    })
  } catch (error) {
    next(error)
  }
})

// Unban user (Admin1 and Admin2)
adminRouter.post('/users/:id/unban', async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, isDeleted: false })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    if (!user.isBanned) {
      throw new AppError('User is not banned', 400)
    }

    user.isBanned = false
    user.bannedAt = null as any
    user.bannedBy = null as any
    user.banReason = null as any
    await user.save()

    res.json({ 
      success: true, 
      message: 'User unbanned successfully',
      data: await User.findById(user._id).select('-password')
    })
  } catch (error) {
    next(error)
  }
})

// ========== PRODUCTS MANAGEMENT ==========

// Get all products
adminRouter.get('/products', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category, status, includeDeleted } = req.query

    const query: any = {}

    // Only Admin2 can see deleted records
    if (req.user!.role === 'admin2' && includeDeleted === 'true') {
      // Include deleted
    } else {
      query.isDeleted = false
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }
    if (category) query.category = category
    if (status) query.status = status

    const skip = (Number(page) - 1) * Number(limit)

    const [products, total] = await Promise.all([
      Product.find(query).sort('-createdAt').skip(skip).limit(Number(limit)).populate('sellerId', 'firstName lastName email').lean(),
      Product.countDocuments(query),
    ])

    // Calculate available quantity for each product
    const { getAvailableQuantity } = await import('../utils/inventory.js')
    const productsWithAvailability = await Promise.all(
      products.map(async (product: any) => {
        const availableQuantity = await getAvailableQuantity(product._id, product.quantity)
        return {
          ...product,
          availableQuantity,
        }
      })
    )

    res.json({
      success: true,
      data: productsWithAvailability,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    })
  } catch (error) {
    next(error)
  }
})

// Get product by ID with details
adminRouter.get('/products/:id', async (req, res, next) => {
  try {
    const query: any = { _id: req.params.id }
    
    // Only Admin2 can see deleted records
    if (req.user!.role !== 'admin2') {
      query.isDeleted = false
    }

    const product = await Product.findOne(query).populate('sellerId', 'firstName lastName email phone').lean()
    
    if (!product) {
      throw new AppError('Product not found', 404)
    }

    // Calculate available quantity
    const { getAvailableQuantity } = await import('../utils/inventory.js')
    const availableQuantity = await getAvailableQuantity(product._id, product.quantity)

    // Get product reviews (active and deleted for admin2)
    const reviewQuery: any = { productId: req.params.id }
    if (req.user!.role !== 'admin2') {
      reviewQuery.isDeleted = { $ne: true }
    }
    const allReviews = await Review.find(reviewQuery).populate('userId', 'firstName lastName').lean()
    
    // Separate active and deleted reviews
    const reviews = allReviews.filter(r => !r.isDeleted)
    const deletedReviews = req.user!.role === 'admin2' ? allReviews.filter(r => r.isDeleted) : []

    res.json({ 
      success: true, 
      data: {
        product: {
          ...product,
          availableQuantity,
        },
        reviews,
        deletedReviews,
        averageRating: reviews.length > 0 
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
          : 0,
        totalReviews: reviews.length,
      }
    })
  } catch (error) {
    next(error)
  }
})

// Update product
adminRouter.put('/products/:id', async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isDeleted: false })

    if (!product) {
      throw new AppError('Product not found', 404)
    }

    // If quantity is being updated, validate against active orders
    if (req.body.quantity !== undefined && req.body.quantity !== product.quantity) {
      const { getAvailableQuantity } = await import('../utils/inventory.js')
      const availableQuantity = await getAvailableQuantity(product._id, product.quantity)
      const orderedQuantity = product.quantity - availableQuantity
      
      if (req.body.quantity < orderedQuantity) {
        throw new AppError(
          `Cannot set inventory to ${req.body.quantity}. There are ${orderedQuantity} units in active orders. ` +
          `Minimum allowed inventory: ${orderedQuantity}`,
          400
        )
      }
    }

    Object.assign(product, req.body)
    await product.save()

    res.json({ success: true, message: 'Product updated', data: product })
  } catch (error) {
    next(error)
  }
})

// Soft delete product (Admin2 only)
adminRouter.delete('/products/:id', requireAdmin2, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      throw new AppError('Product not found', 404)
    }

    if (product.isDeleted) {
      throw new AppError('Product already deleted', 400)
    }

    product.isDeleted = true
    product.deletedAt = new Date()
    product.deletedBy = req.user!._id
    await product.save()

    res.json({ success: true, message: 'Product soft deleted' })
  } catch (error) {
    next(error)
  }
})

// Restore deleted product (Admin2 only)
adminRouter.post('/products/:id/restore', requireAdmin2, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('sellerId', 'isDeleted firstName lastName')

    if (!product) {
      throw new AppError('Product not found', 404)
    }

    if (!product.isDeleted) {
      throw new AppError('Product is not deleted', 400)
    }

    // Check if seller is deleted
    const seller = product.sellerId as any
    if (seller?.isDeleted) {
      throw new AppError(
        `Cannot restore product. Seller account (${seller.firstName} ${seller.lastName}) is deleted. ` +
        `Please restore the seller account first.`,
        400
      )
    }

    product.isDeleted = false
    product.deletedAt = undefined
    product.deletedBy = undefined
    await product.save()

    res.json({ success: true, message: 'Product restored' })
  } catch (error) {
    next(error)
  }
})

// ========== ORDERS MANAGEMENT ==========

// Get all orders
adminRouter.get('/orders', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search, includeDeleted } = req.query

    const query: any = {}
    
    // Only Admin2 can see deleted records
    if (req.user!.role === 'admin2' && includeDeleted === 'true') {
      // Include deleted
    } else {
      query.isDeleted = false
    }

    if (status) query.status = status
    if (search) query.orderNumber = { $regex: search, $options: 'i' }

    const skip = (Number(page) - 1) * Number(limit)

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'firstName lastName email')
        .populate('items.productId', 'name price images'),
      Order.countDocuments(query),
    ])

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    })
  } catch (error) {
    next(error)
  }
})

// Update order status
adminRouter.put('/orders/:id', async (req, res, next) => {
  try {
    const { status, items, totalAmount } = req.body

    const order = await Order.findOne({ _id: req.params.id, isDeleted: false })

    if (!order) {
      throw new AppError('Order not found', 404)
    }

    const previousStatus = order.status

    if (status && status !== previousStatus) {
      // Validate status change from cancelled to active status
      if (previousStatus === 'cancelled' && status !== 'cancelled') {
        const { getAvailableQuantity } = await import('../utils/inventory.js')
        // Changing FROM cancelled to active status - check if inventory is available
        for (const item of order.items) {
          const product = await Product.findById(item.productId)
          if (product) {
            const availableQuantity = await getAvailableQuantity(item.productId, product.quantity)
            if (availableQuantity < item.quantity) {
              throw new AppError(
                `Cannot change order status: Insufficient inventory for "${product.name}". ` +
                `Need ${item.quantity} units but only ${availableQuantity} available.`,
                400
              )
            }
          }
        }
      }

      order.status = status
      // Set confirmation flags based on status
      if (status === 'waiting_to_meet') {
        order.buyerConfirmed = false
        order.sellerConfirmed = false
      } else if (status === 'met_and_exchanged') {
        order.buyerConfirmed = true
        order.sellerConfirmed = true
      }

      // Inventory is calculated dynamically based on order status
      // Cancelled orders are excluded from available quantity calculation
    }
    if (items) order.items = items
    if (totalAmount !== undefined) order.totalAmount = totalAmount
    
    await order.save()

    res.json({ success: true, message: 'Order updated', data: order })
  } catch (error) {
    next(error)
  }
})

// Soft delete order (Admin2 only)
// Inventory is calculated dynamically - deleted orders are excluded
adminRouter.delete('/orders/:id', requireAdmin2, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)

    if (!order) {
      throw new AppError('Order not found', 404)
    }

    if (order.isDeleted) {
      throw new AppError('Order already deleted', 400)
    }

    // Check if deleting this order would cause inventory issues
    // Only check for non-cancelled orders as cancelled orders don't affect inventory
    if (order.status !== 'cancelled') {
      const { getAvailableQuantity } = await import('../utils/inventory.js')
      
      // For each item in the order, verify that deleting won't create negative inventory
      for (const item of order.items) {
        const product = await Product.findById(item.productId)
        if (product) {
          // Calculate what available quantity WOULD be if this order is deleted
          // Current available + this order's quantity should not exceed listed quantity
          const currentAvailable = await getAvailableQuantity(item.productId, product.quantity)
          const potentialAvailable = currentAvailable + item.quantity
          
          // This check ensures we don't delete orders when it would make inventory exceed listed quantity
          // which would only happen if there's a logical flaw in the data
          if (potentialAvailable > product.quantity) {
            throw new AppError(
              `Cannot delete order: Deleting would restore ${item.quantity} units of "${product.name}", ` +
              `but this would result in ${potentialAvailable} available (listed: ${product.quantity}). ` +
              `This indicates a data inconsistency. Please check inventory records.`,
              400
            )
          }
        }
      }
    }

    // No need to restore inventory - it's calculated dynamically
    // Deleted orders (isDeleted=true) are excluded from available quantity calculation

    order.isDeleted = true
    order.deletedAt = new Date()
    order.deletedBy = req.user!._id
    await order.save()

    res.json({ success: true, message: 'Order soft deleted' })
  } catch (error) {
    next(error)
  }
})

// Restore deleted order (Admin2 only)
// Inventory is calculated dynamically - restored orders will be included in calculation
adminRouter.post('/orders/:id/restore', requireAdmin2, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('userId', 'isDeleted firstName lastName')

    if (!order) {
      throw new AppError('Order not found', 404)
    }

    if (!order.isDeleted) {
      throw new AppError('Order is not deleted', 400)
    }

    // Check if user (buyer) is deleted
    const buyer = order.userId as any
    if (buyer?.isDeleted) {
      throw new AppError(
        `Cannot restore order. Buyer account (${buyer.firstName} ${buyer.lastName}) is deleted. ` +
        `Please restore the buyer account first.`,
        400
      )
    }

    // Check if restoring would exceed available inventory
    if (order.status !== 'cancelled' && order.status !== 'met_and_exchanged') {
      const { getAvailableQuantity } = await import('../utils/inventory.js')
      for (const item of order.items) {
        const product = await Product.findById(item.productId)
        if (product) {
          const available = await getAvailableQuantity(item.productId, product.quantity)
          if (available < item.quantity) {
            throw new AppError(`Cannot restore order: insufficient inventory for ${product.name}`, 400)
          }
        }
      }
    }

    order.isDeleted = false
    order.deletedAt = undefined
    order.deletedBy = undefined
    await order.save()

    res.json({ success: true, message: 'Order restored' })
  } catch (error) {
    next(error)
  }
})

// ========== CATEGORIES, COUPONS, REVIEWS - Same pattern ==========

adminRouter.get('/categories', async (req, res, next) => {
  try {
    const categories = await Category.find().sort('name')
    res.json({ success: true, data: categories })
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/categories', async (req, res, next) => {
  try {
    const { name, description, icon } = req.body
    if (!name) throw new AppError('Category name is required', 400)

    const category = new Category({ name, description, icon })
    await category.save()

    res.status(201).json({ success: true, message: 'Category created', data: category })
  } catch (error) {
    next(error)
  }
})

adminRouter.put('/categories/:id', async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!category) throw new AppError('Category not found', 404)
    res.json({ success: true, message: 'Category updated', data: category })
  } catch (error) {
    next(error)
  }
})

adminRouter.delete('/categories/:id', requireAdmin2, async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id)
    if (!category) throw new AppError('Category not found', 404)
    
    if (category.isDeleted) {
      throw new AppError('Category already deleted', 400)
    }

    category.isDeleted = true
    category.deletedAt = new Date()
    category.deletedBy = req.user!._id
    await category.save()

    res.json({ success: true, message: 'Category soft deleted' })
  } catch (error) {
    next(error)
  }
})

// Restore deleted category (Admin2 only)
adminRouter.post('/categories/:id/restore', requireAdmin2, async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id)

    if (!category) {
      throw new AppError('Category not found', 404)
    }

    if (!category.isDeleted) {
      throw new AppError('Category is not deleted', 400)
    }

    category.isDeleted = false
    category.deletedAt = undefined
    category.deletedBy = undefined
    await category.save()

    res.json({ success: true, message: 'Category restored' })
  } catch (error) {
    next(error)
  }
})

// ========== REVIEW MANAGEMENT ==========

// Get all reviews (Admin)
adminRouter.get('/reviews', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, productId } = req.query
    const query: any = {}
    
    if (productId) {
      query.productId = productId
    }

    const skip = (Number(page) - 1) * Number(limit)

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('userId', 'firstName lastName email')
        .populate('productId', 'name')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit)),
      Review.countDocuments(query),
    ])

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    })
  } catch (error) {
    next(error)
  }
})

// Edit a review (Admin1 and Admin2 can edit)
adminRouter.put('/reviews/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { comment, rating } = req.body

    const review = await Review.findById(id)
    if (!review) {
      throw new AppError('Review not found', 404)
    }

    if (comment !== undefined) {
      review.comment = comment
    }

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        throw new AppError('Rating must be between 1 and 5', 400)
      }
      review.rating = rating
    }

    // Track that this was edited by admin
    review.editedByAdmin = req.user!._id
    review.editedAt = new Date()

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

// Delete a review (Admin2 only)
adminRouter.delete('/reviews/:id', requireAdmin2, async (req, res, next) => {
  try {
    const { id } = req.params

    const review = await Review.findOne({ _id: id, isDeleted: { $ne: true } })
    if (!review) {
      throw new AppError('Review not found', 404)
    }

    review.isDeleted = true
    review.deletedAt = new Date()
    review.deletedBy = req.user!._id
    await review.save()

    res.json({
      success: true,
      message: 'Review deleted successfully',
    })
  } catch (error) {
    next(error)
  }
})

// Restore a deleted review (Admin2 only)
adminRouter.post('/reviews/:id/restore', requireAdmin2, async (req, res, next) => {
  try {
    const { id } = req.params

    const review = await Review.findById(id)
    if (!review) {
      throw new AppError('Review not found', 404)
    }

    if (!review.isDeleted) {
      throw new AppError('Review is not deleted', 400)
    }

    review.isDeleted = false
    review.deletedAt = undefined
    review.deletedBy = undefined
    await review.save()

    res.json({
      success: true,
      message: 'Review restored successfully',
    })
  } catch (error) {
    next(error)
  }
})

// ========== DASHBOARD STATISTICS ==========

adminRouter.get('/stats', async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      recentOrders,
      topProducts,
    ] = await Promise.all([
      User.countDocuments({ isDeleted: false }),
      Product.countDocuments({ isDeleted: false }),
      Order.countDocuments({ isDeleted: false }),
      Order.aggregate([
        { 
          $match: { 
            isDeleted: false,
            status: { $ne: 'cancelled' },
            buyerConfirmed: true, 
            sellerConfirmed: true 
          } 
        },
        { $unwind: '$items' },
        { 
          $lookup: {
            from: 'products',
            localField: 'items.productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $lookup: {
            from: 'users',
            localField: 'product.sellerId',
            foreignField: '_id',
            as: 'seller'
          }
        },
        { $unwind: '$seller' },
        {
          $match: {
            'seller.isDeleted': false
          }
        },
        {
          $group: {
            _id: '$_id',
            totalAmount: { $first: '$totalAmount' }
          }
        },
        { $addFields: { totalAmountNum: { $toDouble: '$totalAmount' } } },
        { $group: { _id: null, total: { $sum: '$totalAmountNum' } } },
      ]),
      Order.find({ isDeleted: false }).sort('-createdAt').limit(5).populate('userId', 'firstName lastName email'),
      Product.find({ isDeleted: false }).sort('-createdAt').limit(5).select('name price status condition images'),
    ])

    res.json({
      success: true,
      data: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: (totalRevenue[0]?.total || 0).toFixed(2),
        recentOrders,
        topProducts,
      },
    })
  } catch (error) {
    next(error)
  }
})

// ========== DISPUTES MANAGEMENT ==========

// Get all disputes (Admin only)
adminRouter.get('/disputes', async (req, res, next) => {
  try {
    const { includeDeleted } = req.query
    const { Dispute } = await import('../models/Dispute.js')
    
    const query: any = {}
    
    // Only Admin2 can see deleted records
    if (req.user!.role === 'admin2' && includeDeleted === 'true') {
      // Include deleted
    } else {
      query.isDeleted = { $ne: true }
    }

    const disputes = await Dispute.find(query)
      .populate('orderId', 'orderNumber totalAmount status isDeleted')
      .populate('buyerId', 'firstName lastName email isBanned isDeleted')
      .populate('sellerId', 'firstName lastName email isBanned isDeleted')
      .populate('messages.senderId', 'firstName lastName role')
      .sort('-createdAt')

    res.json({
      success: true,
      data: disputes,
    })
  } catch (error) {
    next(error)
  }
})

// Soft delete dispute (Admin2 only)
adminRouter.delete('/disputes/:id', requireAdmin2, async (req, res, next) => {
  try {
    const { Dispute } = await import('../models/Dispute.js')
    const dispute = await Dispute.findById(req.params.id)

    if (!dispute) {
      throw new AppError('Dispute not found', 404)
    }

    if (dispute.isDeleted) {
      throw new AppError('Dispute already deleted', 400)
    }

    dispute.isDeleted = true
    dispute.deletedAt = new Date()
    dispute.deletedBy = req.user!._id
    await dispute.save()

    res.json({ success: true, message: 'Dispute soft deleted' })
  } catch (error) {
    next(error)
  }
})

// Restore deleted dispute (Admin2 only)
adminRouter.post('/disputes/:id/restore', requireAdmin2, async (req, res, next) => {
  try {
    const { Dispute } = await import('../models/Dispute.js')
    const dispute = await Dispute.findById(req.params.id)

    if (!dispute) {
      throw new AppError('Dispute not found', 404)
    }

    if (!dispute.isDeleted) {
      throw new AppError('Dispute is not deleted', 400)
    }

    // Check if there's an active (non-deleted) dispute for the same order
    const existingDispute = await Dispute.findOne({
      orderId: dispute.orderId,
      isDeleted: false,
      _id: { $ne: dispute._id }
    })

    if (existingDispute) {
      throw new AppError(
        'Cannot restore this dispute. An active dispute already exists for this order. ' +
        'Please delete the existing dispute first before restoring this one.',
        409
      )
    }

    dispute.isDeleted = false
    dispute.deletedAt = undefined
    dispute.deletedBy = undefined
    await dispute.save()

    res.json({ success: true, message: 'Dispute restored' })
  } catch (error) {
    next(error)
  }
})

// ========== PAYMENT MANAGEMENT ==========

// Get all payments (Admin only)
adminRouter.get('/payments', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search, includeDeleted, orderId } = req.query
    const isAdmin2 = (req as any).user.role === 'admin2'

    const query: any = {}
    
    // Admin2 can view deleted records
    if (includeDeleted === 'true' && isAdmin2) {
      // No filter for isDeleted
    } else {
      query.isDeleted = false
    }

    if (status) {
      query.status = status
    }

    if (orderId) {
      query.orderId = orderId
    }

    const payments = await Payment.find(query)
      .populate('userId', 'firstName lastName email')
      .populate('orderId', 'orderNumber totalAmount')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean()

    const total = await Payment.countDocuments(query)

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    })
  } catch (error) {
    next(error)
  }
})

// Get payment by ID with full details (Admin only)
adminRouter.get('/payments/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const payment = await Payment.findById(id)
      .populate('userId', 'firstName lastName email phone')
      .populate('orderId')

    if (!payment) {
      throw new AppError('Payment not found', 404)
    }

    res.json({
      success: true,
      data: { payment },
    })
  } catch (error) {
    next(error)
  }
})

// Update payment status (Admin only)
adminRouter.put('/payments/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const { status, failureReason, billingAddress, cardDetails } = req.body

    const payment = await Payment.findById(id)
    if (!payment) {
      throw new AppError('Payment not found', 404)
    }

    if (status) {
      payment.status = status
    }

    if (failureReason) {
      payment.failureReason = failureReason
    }

    if (billingAddress) {
      payment.billingAddress = billingAddress
    }

    if (cardDetails) {
      // If cardNumber is provided, automatically extract lastFourDigits
      if (cardDetails.cardNumber) {
        cardDetails.lastFourDigits = cardDetails.cardNumber.slice(-4)
      }
      payment.cardDetails = cardDetails
    }

    if (status === 'completed' && !payment.paymentDate) {
      payment.paymentDate = new Date()
    }

    if (status === 'refunded' && !payment.refundDate) {
      payment.refundDate = new Date()
      payment.refundAmount = payment.amount
    }

    await payment.save()

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: { payment },
    })
  } catch (error) {
    next(error)
  }
})

// Process refund (Admin2 only)
adminRouter.post('/payments/:id/refund', requireAdmin2, async (req, res, next) => {
  try {
    const { id } = req.params
    const { amount, reason } = req.body

    const payment = await Payment.findById(id)
    if (!payment) {
      throw new AppError('Payment not found', 404)
    }

    if (payment.status !== 'completed') {
      throw new AppError('Only completed payments can be refunded', 400)
    }

    payment.status = 'refunded'
    payment.refundDate = new Date()
    payment.refundAmount = amount || payment.amount
    payment.failureReason = reason || 'Admin processed refund'

    await payment.save()

    // Cancel order - inventory is calculated dynamically
    const order = await Order.findById(payment.orderId)
    if (order && order.status !== 'cancelled') {
      order.status = 'cancelled'
      await order.save()
      // No need to restore inventory - cancelled orders are excluded from calculation
    }

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: { payment },
    })
  } catch (error) {
    next(error)
  }
})

// Delete payment (Admin2 only - soft delete)
adminRouter.delete('/payments/:id', requireAdmin2, async (req, res, next) => {
  try {
    const { id } = req.params
    const adminId = (req as any).user._id

    const payment = await Payment.findById(id)
    if (!payment) {
      throw new AppError('Payment not found', 404)
    }

    payment.isDeleted = true
    payment.deletedAt = new Date()
    payment.deletedBy = adminId

    await payment.save()

    res.json({
      success: true,
      message: 'Payment deleted successfully',
    })
  } catch (error) {
    next(error)
  }
})

// Restore deleted payment (Admin2 only)
adminRouter.post('/payments/:id/restore', requireAdmin2, async (req, res, next) => {
  try {
    const { id } = req.params

    const payment = await Payment.findById(id).populate('userId', 'isDeleted firstName lastName').populate('orderId', 'isDeleted orderNumber')

    if (!payment) {
      throw new AppError('Payment not found', 404)
    }

    if (!payment.isDeleted) {
      throw new AppError('Payment is not deleted', 400)
    }

    // Check if user is deleted
    const user = payment.userId as any
    if (user?.isDeleted) {
      throw new AppError(
        `Cannot restore payment. User account (${user.firstName} ${user.lastName}) is deleted. ` +
        `Please restore the user account first.`,
        400
      )
    }

    // Check if order is deleted
    const order = payment.orderId as any
    if (order?.isDeleted) {
      throw new AppError(
        `Cannot restore payment. Order (${order.orderNumber}) is deleted. ` +
        `Please restore the order first.`,
        400
      )
    }

    payment.isDeleted = false
    payment.deletedAt = undefined
    payment.deletedBy = undefined
    await payment.save()

    res.json({ success: true, message: 'Payment restored successfully' })
  } catch (error) {
    next(error)
  }
})

// Get payment statistics (Admin only)
adminRouter.get('/stats/payments', async (req, res, next) => {
  try {
    const [totalPayments, completedPayments, pendingPayments, failedPayments, totalRevenue, refundedAmount] = await Promise.all([
      Payment.countDocuments({ isDeleted: false }),
      Payment.countDocuments({ status: 'completed', isDeleted: false }),
      Payment.countDocuments({ status: 'pending', isDeleted: false }),
      Payment.countDocuments({ status: 'failed', isDeleted: false }),
      Payment.aggregate([
        { $match: { status: 'completed', isDeleted: false } },
        { $addFields: { amountNum: { $toDouble: '$amount' } } },
        { $group: { _id: null, total: { $sum: '$amountNum' } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'refunded', isDeleted: false } },
        { $addFields: { refundAmountNum: { $toDouble: '$refundAmount' } } },
        { $group: { _id: null, total: { $sum: '$refundAmountNum' } } },
      ]),
    ])

    res.json({
      success: true,
      data: {
        totalPayments,
        completedPayments,
        pendingPayments,
        failedPayments,
        totalRevenue: (totalRevenue[0]?.total || 0).toFixed(2),
        refundedAmount: (refundedAmount[0]?.total || 0).toFixed(2),
      },
    })
  } catch (error) {
    next(error)
  }
})

