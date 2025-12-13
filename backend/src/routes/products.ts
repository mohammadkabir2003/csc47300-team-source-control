import express from 'express'
import { Product } from '../models/Product.js'
import { Category } from '../models/Category.js'
import { Order } from '../models/Order.js'
import { User } from '../models/User.js'
import { AppError } from '../middleware/errorHandler.js'
import { authMiddleware } from '../middleware/auth.js'
import { getAvailableQuantity } from '../utils/inventory.js'

export const productsRouter = express.Router()
productsRouter.get('/', async (req, res, next) => {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      condition,
      status = 'available',
      sort = '-createdAt',
      page = 1,
      limit = 20,
    } = req.query

    const bannedOrDeletedUsers = await User.find({
      $or: [{ isBanned: true }, { isDeleted: true }]
    }).select('_id')
    const excludedSellerIds = bannedOrDeletedUsers.map(u => u._id)

    const query: any = { 
      isDeleted: { $ne: true },
      sellerId: { $nin: excludedSellerIds }
    }

    if (status) query.status = status
    if (category) query.category = category
    if (condition) query.condition = condition
    if (minPrice || maxPrice) {
      query.price = {}
      if (minPrice) query.price.$gte = Number(minPrice)
      if (maxPrice) query.price.$lte = Number(maxPrice)
    }
    if (search) {
      query.$text = { $search: search as string }
    }

    const skip = (Number(page) - 1) * Number(limit)

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sort as string)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments(query),
    ])

    const productsWithAvailability = await Promise.all(
      products.map(async (product) => {
        const availableQuantity = await getAvailableQuantity(product._id, product.quantity)
        return {
          ...product,
          availableQuantity,
          status: availableQuantity === 0 ? 'sold' : product.status,
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

productsRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const product = await Product.findOne({ _id: id, isDeleted: { $ne: true } }).populate('sellerId', 'isBanned isDeleted').lean()

    if (!product) {
      throw new AppError('Product not found', 404)
    }

    const seller = product.sellerId as any
    if (seller?.isBanned || seller?.isDeleted) {
      throw new AppError('Product not available - seller account is inactive', 404)
    }

    const availableQuantity = await getAvailableQuantity(product._id, product.quantity)

    res.json({
      success: true,
      data: {
        ...product,
        availableQuantity,
        status: availableQuantity === 0 ? 'sold' : product.status,
      },
    })
  } catch (error) {
    next(error)
  }
})

productsRouter.post('/', authMiddleware, async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      category,
      condition,
      images,
      campus,
      quantity,
    } = req.body

    const user = req.user

    console.log('Product creation request:', { name, description, price, category, condition, campus, quantity, images })

    if (!name || !description || !price || !category || !condition || !campus) {
      const missing = []
      if (!name) missing.push('name')
      if (!description) missing.push('description')
      if (!price) missing.push('price')
      if (!category) missing.push('category')
      if (!condition) missing.push('condition')
      if (!campus) missing.push('campus')
      
      throw new AppError(`Missing required fields: ${missing.join(', ')}`, 400)
    }

    let categoryDoc = await Category.findOne({ slug: category.toLowerCase().replace(/\s+/g, '-') })
    if (!categoryDoc) {
      categoryDoc = await Category.create({
        name: category,
        slug: category.toLowerCase().replace(/\s+/g, '-'),
      })
    }

    const product = new Product({
      name,
      description,
      price,
      category: categoryDoc.name,
      condition,
      images: images || [],
      campus,
      quantity: quantity || 1,
      sellerId: user!._id,
      sellerName: `${user!.firstName} ${user!.lastName}`,
      sellerEmail: user!.email,
      status: 'available',
    })

    await product.save()

    await Category.findByIdAndUpdate(categoryDoc._id, {
      $inc: { productCount: 1 },
    })

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    })
  } catch (error) {
    next(error)
  }
})

productsRouter.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params
    const user = req.user
    const updates = req.body

    const product = await Product.findOne({ _id: id, isDeleted: { $ne: true } })

    if (!product) {
      throw new AppError('Product not found', 404)
    }

    if (product.sellerId.toString() !== user!._id.toString() && !['admin1', 'admin2'].includes(user!.role)) {
      throw new AppError('Not authorized to update this product', 403)
    }

    if (updates.quantity !== undefined && updates.quantity !== product.quantity) {
      const availableQuantity = await getAvailableQuantity(product._id, product.quantity)
      const orderedQuantity = product.quantity - availableQuantity
      
      if (updates.quantity < orderedQuantity) {
        throw new AppError(
          `Cannot set inventory to ${updates.quantity}. You have ${orderedQuantity} units in active orders. ` +
          `Minimum allowed inventory: ${orderedQuantity}`,
          400
        )
      }
    }

    Object.assign(product, updates)
    await product.save()

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    })
  } catch (error) {
    next(error)
  }
})

productsRouter.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params
    const user = req.user

    const product = await Product.findOne({ _id: id, isDeleted: { $ne: true } })

    if (!product) {
      throw new AppError('Product not found', 404)
    }

    if (product.sellerId.toString() !== user!._id.toString() && !['admin1', 'admin2'].includes(user!.role)) {
      throw new AppError('Not authorized to delete this product', 403)
    }

    const activeOrders = await Order.countDocuments({
      'items.productId': id,
      status: { $in: ['waiting_to_meet'] },
      isDeleted: false,
    })

    if (activeOrders > 0) {
      throw new AppError('Cannot delete product with active orders. Please wait for orders to complete or cancel them first.', 400)
    }

    product.isDeleted = true
    product.deletedAt = new Date()
    product.deletedBy = user!._id
    await product.save()

    await Category.findOneAndUpdate(
      { name: product.category },
      { $inc: { productCount: -1 } }
    )

    res.json({
      success: true,
      message: 'Product deleted successfully',
    })
  } catch (error) {
    next(error)
  }
})

productsRouter.get('/user/my-products', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user!

    const products = await Product.find({ 
      sellerId: user._id,
      isDeleted: { $ne: true }
    }).sort('-createdAt').lean()

    const productsWithAvailability = await Promise.all(
      products.map(async (product) => {
        const availableQuantity = await getAvailableQuantity(product._id, product.quantity)
        return {
          ...product,
          availableQuantity,
          status: availableQuantity === 0 ? 'sold' : product.status,
        }
      })
    )

    res.json({
      success: true,
      data: productsWithAvailability,
    })
  } catch (error) {
    next(error)
  }
})
