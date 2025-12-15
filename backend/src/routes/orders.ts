import express from 'express'
import { Order } from '../models/Order.js'
import { Cart } from '../models/Cart.js'
import { Product } from '../models/Product.js'
import { AppError } from '../middleware/errorHandler.js'
import { authMiddleware } from '../middleware/auth.js'
import { getAvailableQuantity } from '../utils/inventory.js'
import { orderCreationRateLimiter } from '../middleware/rateLimiter.js'

export const ordersRouter = express.Router()

ordersRouter.use(authMiddleware)

ordersRouter.get('/seller/my-orders', async (req, res, next) => {
  try {
    const userId = req.user!._id

    const sellerProducts = await Product.find({ sellerId: userId }).select('_id')
    const productIds = sellerProducts.map(p => p._id)

    const orders = await Order.find({
      'items.productId': { $in: productIds },
      isDeleted: { $ne: true }
    })
      .populate('userId', 'firstName lastName email isBanned isDeleted')
      .populate('items.productId', 'name price images')
      .populate('disputeId', 'isDeleted')
      .sort('-createdAt')
      .lean()

    const ordersWithBuyerStatus = orders.map(order => {
      const buyer = order.userId as any
      const dispute = order.disputeId as any
      
      const orderData = { ...order }
      if (dispute?.isDeleted) {
        orderData.disputeId = undefined
      }
      
      return {
        ...orderData,
        buyerBanned: buyer?.isBanned || false,
        buyerDeleted: buyer?.isDeleted || false
      }
    })

    res.json({
      success: true,
      data: ordersWithBuyerStatus,
    })
  } catch (error) {
    next(error)
  }
})

ordersRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user!._id

    const orders = await Order.find({ userId, isDeleted: { $ne: true } })
      .sort('-createdAt')
      .populate('items.productId', 'name price images')
      .populate('disputeId', 'isDeleted')
      .lean()

    const ordersWithSellerStatus = await Promise.all(
      orders.map(async (order) => {
        const dispute = order.disputeId as any
        
        const orderData = { ...order }
        if (dispute?.isDeleted) {
          orderData.disputeId = undefined
        }
        
        const itemsWithSellerStatus = await Promise.all(
          orderData.items.map(async (item: any) => {
            if (item.productId) {
              const product = await Product.findById(item.productId._id).populate('sellerId', 'isBanned isDeleted firstName lastName email')
              const seller = product?.sellerId as any
              const sid = seller?._id || undefined
              return {
                ...item,
                sellerBanned: seller?.isBanned || false,
                sellerDeleted: seller?.isDeleted || false,
                sellerId: sid,
                sellerName: seller ? `${seller.firstName} ${seller.lastName}`.trim() : undefined,
                sellerEmail: seller?.email
              }
            }
            return item
          })
        )
        return {
          ...orderData,
          items: itemsWithSellerStatus
        }
      })
    )

    res.json({
      success: true,
      data: ordersWithSellerStatus,
    })
  } catch (error) {
    next(error)
  }
})

ordersRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user!._id

    const order = await Order.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('items.productId', 'name images')
      .populate('disputeId', 'isDeleted')
      .lean()

    if (!order) {
      throw new AppError('Order not found', 404)
    }

    if (order.userId.toString() !== userId.toString() && !['admin1', 'admin2'].includes(req.user!.role)) {
      throw new AppError('Not authorized to view this order', 403)
    }

    const dispute = order.disputeId as any
    if (dispute?.isDeleted) {
      order.disputeId = undefined
    }

    res.json({
      success: true,
      data: order,
    })
  } catch (error) {
    next(error)
  }
})

ordersRouter.post('/', orderCreationRateLimiter, async (req, res, next) => {
  const session = await Order.startSession()
  
  try {
    await session.startTransaction()
    
    const userId = req.user!._id
    const { shippingAddress, billingAddress, cardDetails, paymentMethod } = req.body

    if (!shippingAddress) {
      throw new AppError('Shipping address is required', 400)
    }

    if (!billingAddress) {
      throw new AppError('Billing address is required', 400)
    }

    if (!cardDetails || !cardDetails.cardNumber || !/^\d{16}$/.test(cardDetails.cardNumber)) {
      throw new AppError('Valid card details required', 400)
    }

    const cart = await Cart.findOne({ userId }).session(session)

    if (!cart || cart.items.length === 0) {
      throw new AppError('Cart is empty', 400)
    }

    for (const item of cart.items) {
      const product = await Product.findById(item.productId).session(session)
      if (!product || product.status === 'sold' || product.isDeleted) {
        throw new AppError(`Product ${item.name} is no longer available`, 400)
      }
      
      const seller = await (await import('../models/User.js')).User.findById(product.sellerId).session(session)
      if (seller?.isDeleted || seller?.isBanned) {
        throw new AppError(`Product ${item.name} is no longer available (seller account issues)`, 400)
      }
      
      const available = await getAvailableQuantity(item.productId, product.quantity)
      if (available < item.quantity) {
        throw new AppError(`Product ${item.name} only has ${available} available`, 400)
      }
    }

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    
    const order = new Order({
      userId,
      orderNumber,
      items: cart.items,
      totalAmount: cart.totalAmount,
      shippingAddress,
      status: 'waiting_to_meet',
    })

    await order.save({ session })

    const Payment = (await import('../models/Payment.js')).Payment
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    
    const payment = new Payment({
      orderId: order._id,
      userId,
      amount: order.totalAmount,
      currency: 'USD',
      paymentMethod: paymentMethod || 'credit_card',
      status: 'completed',
      transactionId,
      cardDetails: {
        cardNumber: cardDetails.cardNumber,
        cardHolderName: cardDetails.cardHolderName,
        expiryDate: cardDetails.expiryDate,
        cvv: cardDetails.cvv,
        lastFourDigits: cardDetails.cardNumber.slice(-4),
        cardType: 'credit',
      },
      billingAddress,
      paymentDate: new Date(),
    })

    await payment.save({ session })

    cart.items = []
    await cart.save({ session })

    await session.commitTransaction()
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    })
  } catch (error) {
    await session.abortTransaction()
    next(error)
  } finally {
    session.endSession()
  }
})

ordersRouter.put('/:id/buyer-confirm', async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user!._id

    const order = await Order.findOne({ _id: id, isDeleted: false }).populate('items.productId', 'sellerId')

    if (!order) {
      throw new AppError('Order not found', 404)
    }

    if (order.buyerConfirmed) {
      throw new AppError('You have already confirmed this order', 400)
    }

    if (order.status === 'cancelled' || order.status === 'met_and_exchanged') {
      throw new AppError('Cannot confirm this order in current state', 400)
    }
    
    if (order.status !== 'waiting_to_meet') {
      throw new AppError('Order is not ready for confirmation', 400)
    }

    if (order.userId.toString() !== userId.toString()) {
      throw new AppError('Only the buyer can confirm this order', 403)
    }

    order.buyerConfirmed = true
    
    if (order.sellerConfirmed) {
      order.status = 'met_and_exchanged'
    }

    await order.save()

    res.json({
      success: true,
      message: 'Order confirmed successfully',
      data: order,
    })
  } catch (error) {
    next(error)
  }
})

ordersRouter.put('/:id/seller-confirm', async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user!._id

    const order = await Order.findOne({ _id: id, isDeleted: false }).populate('items.productId', 'sellerId')

    if (!order) {
      throw new AppError('Order not found', 404)
    }

    if (order.sellerConfirmed) {
      throw new AppError('You have already confirmed this order', 400)
    }

    if (order.status === 'cancelled' || order.status === 'met_and_exchanged') {
      throw new AppError('Cannot confirm this order in current state', 400)
    }
    
    if (order.status !== 'waiting_to_meet') {
      throw new AppError('Order is not ready for confirmation', 400)
    }

    const firstProduct = order.items[0].productId as any
    const sellerId = firstProduct.sellerId

    if (sellerId.toString() !== userId.toString()) {
      throw new AppError('Only the seller can confirm this order', 403)
    }

    order.sellerConfirmed = true
    
    if (order.buyerConfirmed) {
      order.status = 'met_and_exchanged'
    }

    await order.save()

    res.json({
      success: true,
      message: 'Order confirmed successfully',
      data: order,
    })
  } catch (error) {
    next(error)
  }
})

ordersRouter.put('/:id/cancel', async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user!._id

    const order = await Order.findOne({ _id: id, isDeleted: false })

    if (!order) {
      throw new AppError('Order not found', 404)
    }

    if (order.userId.toString() !== userId.toString() && !['admin1', 'admin2'].includes(req.user!.role)) {
      throw new AppError('Not authorized to cancel this order', 403)
    }

    if (order.status === 'met_and_exchanged' || order.status === 'cancelled') {
      throw new AppError('Cannot cancel this order', 400)
    }

    order.status = 'cancelled'
    await order.save()

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order,
    })
  } catch (error) {
    next(error)
  }
})

ordersRouter.put('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const userId = req.user!._id

    const order = await Order.findOne({ _id: id, isDeleted: false }).populate('items.productId', 'sellerId')

    if (!order) {
      throw new AppError('Order not found', 404)
    }

    const firstProduct = order.items[0].productId as any
    const sellerId = firstProduct?.sellerId

    const isAuthorized = 
      sellerId?.toString() === userId.toString() || 
      req.user!.role === 'admin1' || 
      req.user!.role === 'admin2'

    if (!isAuthorized) {
      throw new AppError('Not authorized to update this order', 403)
    }

    const validStatuses = ['waiting_to_meet', 'met_and_exchanged', 'cancelled', 'disputed']
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid status', 400)
    }

    if (order.status === 'cancelled' && status !== 'cancelled') {
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
    
    if (order.status === 'met_and_exchanged' && status !== 'disputed') {
      throw new AppError('Cannot change status of a completed order except to disputed', 400)
    }

        const previousStatus = order.status

    order.status = status as any
    
    await order.save()

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order,
    })
  } catch (error) {
    next(error)
  }
})
