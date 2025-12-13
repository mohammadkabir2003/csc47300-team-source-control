import express from 'express'
import { Cart } from '../models/Cart.js'
import { Product } from '../models/Product.js'
import { AppError } from '../middleware/errorHandler.js'
import { authMiddleware } from '../middleware/auth.js'
import { getAvailableQuantity } from '../utils/inventory.js'

export const cartRouter = express.Router()

cartRouter.use(authMiddleware)

cartRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user!._id

    let cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      select: 'name price images status',
      match: { isDeleted: { $ne: true } }
    })

    if (!cart) {
      cart = new Cart({ userId, items: [] })
      await cart.save()
    }

    if (cart.items) {
      cart.items = cart.items.filter(item => item.productId != null)
    }

    res.json({
      success: true,
      data: cart,
    })
  } catch (error) {
    next(error)
  }
})

cartRouter.post('/items', async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body
    const userId = req.user!._id

    if (!productId) {
      throw new AppError('Product ID is required', 400)
    }

    const product = await Product.findOne({ _id: productId, isDeleted: { $ne: true } }).populate('sellerId', 'isBanned isDeleted')

    if (!product) {
      throw new AppError('Product not found or no longer available', 404)
    }

    if (product.status !== 'available') {
      throw new AppError('Product is not available', 400)
    }

    const seller = product.sellerId as any
    if (seller?.isBanned || seller?.isDeleted) {
      throw new AppError('This product is no longer available (seller account issues)', 400)
    }

    if ((typeof product.sellerId === 'object' ? seller._id : product.sellerId).toString() === userId.toString()) {
      throw new AppError('You cannot purchase your own product', 400)
    }

    const available = await getAvailableQuantity(productId, product.quantity)
    if (available < quantity) {
      throw new AppError(`Only ${available} available`, 400)
    }

    let cart = await Cart.findOne({ userId })

    if (!cart) {
      cart = new Cart({ userId, items: [] })
    }

    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    )

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + quantity
      const available = await getAvailableQuantity(productId, product.quantity)
      if (available < newQuantity) {
        throw new AppError(`Cannot add ${quantity} more. Only ${available - cart.items[existingItemIndex].quantity} additional available`, 400)
      }
      cart.items[existingItemIndex].quantity = newQuantity
      cart.items[existingItemIndex].price = product.price
    } else {
      cart.items.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity,
        image: product.images[0],
      })
    }

    const calculatedTotal = cart.items.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity)
    }, 0)
    cart.totalAmount = calculatedTotal.toFixed(2)

    await cart.save()

    res.json({
      success: true,
      message: 'Item added to cart',
      data: cart,
    })
  } catch (error) {
    next(error)
  }
})

cartRouter.put('/items/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params
    const { quantity } = req.body
    const userId = req.user!._id

    if (quantity < 1) {
      throw new AppError('Quantity must be at least 1', 400)
    }

    const cart = await Cart.findOne({ userId })

    if (!cart) {
      throw new AppError('Cart not found', 404)
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    )

    if (itemIndex === -1) {
      throw new AppError('Item not found in cart', 404)
    }

    const product = await Product.findOne({ _id: productId, isDeleted: { $ne: true } })

    if (!product) {
      throw new AppError('Product no longer available', 404)
    }

    const available = await getAvailableQuantity(productId, product.quantity)
    if (available < quantity) {
      throw new AppError(`Only ${available} available`, 400)
    }

    cart.items[itemIndex].quantity = quantity
    cart.items[itemIndex].price = product.price
    
    const calculatedTotal = cart.items.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity)
    }, 0)
    cart.totalAmount = calculatedTotal.toFixed(2)
    
    await cart.save()

    res.json({
      success: true,
      message: 'Cart updated',
      data: cart,
    })
  } catch (error) {
    next(error)
  }
})

cartRouter.delete('/items/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params
    const userId = req.user!._id

    const cart = await Cart.findOne({ userId })

    if (!cart) {
      throw new AppError('Cart not found', 404)
    }

    cart.items = cart.items.filter((item) => item.productId.toString() !== productId)
    await cart.save()

    res.json({
      success: true,
      message: 'Item removed from cart',
      data: cart,
    })
  } catch (error) {
    next(error)
  }
})

cartRouter.delete('/', async (req, res, next) => {
  try {
    const userId = req.user!._id

    const cart = await Cart.findOne({ userId })

    if (cart) {
      cart.items = []
      await cart.save()
    }

    res.json({
      success: true,
      message: 'Cart cleared',
    })
  } catch (error) {
    next(error)
  }
})
