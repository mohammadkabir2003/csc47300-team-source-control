import express from 'express'
import { Dispute } from '../models/Dispute.js'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { AppError } from '../middleware/errorHandler.js'
import { authMiddleware } from '../middleware/auth.js'

export const disputesRouter = express.Router()

disputesRouter.use(authMiddleware)

disputesRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user!._id
    
    const disputes = await Dispute.find({
      $or: [
        { buyerId: userId },
        { sellerId: userId },
      ],
      isDeleted: { $ne: true }
    })
      .populate('orderId', 'orderNumber totalAmount status isDeleted')
      .populate('buyerId', 'firstName lastName email isBanned isDeleted')
      .populate('sellerId', 'firstName lastName email isBanned isDeleted')
      .sort('-createdAt')
      .lean()

    const disputesWithStatus = disputes.map(dispute => {
      const order = dispute.orderId as any
      return {
        ...dispute,
        orderDeleted: order?.isDeleted || false
      }
    })

    res.json({
      success: true,
      data: disputesWithStatus,
    })
  } catch (error) {
    next(error)
  }
})

disputesRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user!._id
    const userRole = req.user!.role

    const dispute = await Dispute.findById(id)
      .populate('orderId', 'orderNumber totalAmount items status isDeleted')
      .populate('buyerId', 'firstName lastName email isBanned isDeleted')
      .populate('sellerId', 'firstName lastName email isBanned isDeleted')
      .populate('messages.senderId', 'firstName lastName role')
      .lean()

    if (!dispute) {
      throw new AppError('Dispute not found', 404)
    }

    if (dispute.isDeleted && userRole !== 'admin1' && userRole !== 'admin2') {
      throw new AppError('Dispute not found', 404)
    }

    const buyerId = (dispute.buyerId as any)._id || dispute.buyerId
    const sellerId = (dispute.sellerId as any)._id || dispute.sellerId
    const isAuthorized =
      buyerId.toString() === userId.toString() ||
      sellerId.toString() === userId.toString() ||
      userRole === 'admin1' ||
      userRole === 'admin2'

    if (!isAuthorized) {
      throw new AppError('Not authorized to view this dispute', 403)
    }

    const order = dispute.orderId as any
    const disputeWithStatus = {
      ...dispute,
      orderDeleted: order?.isDeleted || false
    }

    res.json({
      success: true,
      data: disputeWithStatus,
    })
  } catch (error) {
    next(error)
  }
})

disputesRouter.post('/', async (req, res, next) => {
  try {
    const { orderId, reason } = req.body
    const userId = req.user!._id

    if (!orderId || !reason) {
      throw new AppError('Order ID and reason are required', 400)
    }
    
    if (reason.trim().length < 1) {
      throw new AppError('Dispute reason cannot be empty', 400)
    }
    
    if (reason.length > 5000) {
      throw new AppError('Dispute reason must not exceed 5000 characters', 400)
    }

    const order = await Order.findOne({ _id: orderId, isDeleted: false }).populate('items.productId', 'sellerId')

    if (!order) {
      throw new AppError('Order not found', 404)
    }

    const firstProduct = order.items[0].productId as any
    const sellerId = firstProduct?.sellerId

    const isBuyer = order.userId.toString() === userId.toString()
    const isSeller = sellerId?.toString() === userId.toString()

    if (!isBuyer && !isSeller) {
      throw new AppError('Only the buyer or seller can create a dispute for this order', 403)
    }

    const existingDispute = await Dispute.findOne({ orderId, isDeleted: false })
    if (existingDispute) {
      throw new AppError('An active dispute already exists for this order', 400)
    }

    const productIds = order.items.map((item) => item.productId)

    const dispute = new Dispute({
      orderId,
      buyerId: order.userId,
      sellerId,
      productIds,
      reason,
      messages: [
        {
          senderId: userId,
          senderRole: isBuyer ? 'buyer' : 'seller',
          message: reason,
          createdAt: new Date(),
        },
      ],
    })

    await dispute.save()

    order.disputeId = dispute._id
    await order.save()

    res.status(201).json({
      success: true,
      message: 'Dispute created successfully',
      data: dispute,
    })
  } catch (error) {
    next(error)
  }
})

disputesRouter.post('/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params
    const { message } = req.body
    const userId = req.user!._id
    const userRole = req.user!.role

    if (!message) {
      throw new AppError('Message is required', 400)
    }
    
    if (message.length < 10) {
      throw new AppError('Message must be at least 10 characters', 400)
    }
    
    if (message.length > 5000) {
      throw new AppError('Message must not exceed 5000 characters', 400)
    }
    
    const sanitizedMessage = message.trim().replace(/\0/g, '')
    
    if (!sanitizedMessage) {
      throw new AppError('Message cannot be empty', 400)
    }

    const dispute = await Dispute.findById(id).populate('orderId', 'isDeleted')

    if (!dispute) {
      throw new AppError('Dispute not found', 404)
    }

    const order = dispute.orderId as any
    if (order?.isDeleted) {
      throw new AppError('Cannot send messages to a dispute on a deleted order', 403)
    }

    if (dispute.status === 'resolved' || dispute.status === 'closed') {
      throw new AppError('Cannot send messages to a ' + dispute.status + ' dispute', 403)
    }

    let senderRole: 'buyer' | 'seller' | 'admin'
    if (userRole === 'admin1' || userRole === 'admin2') {
      senderRole = 'admin'
    } else if (dispute.buyerId.toString() === userId.toString()) {
      senderRole = 'buyer'
    } else if (dispute.sellerId.toString() === userId.toString()) {
      senderRole = 'seller'
    } else {
      throw new AppError('Not authorized to add messages to this dispute', 403)
    }

    dispute.messages.push({
      senderId: userId,
      senderRole,
      message: sanitizedMessage,
      createdAt: new Date(),
    })

    if (senderRole === 'admin' && dispute.status === 'open') {
      dispute.status = 'under_review'
    }

    await dispute.save()

    res.json({
      success: true,
      message: 'Message added successfully',
      data: dispute,
    })
  } catch (error) {
    next(error)
  }
})

disputesRouter.put('/:id/resolve', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params
    const { resolution } = req.body
    const user = req.user!

    if (user.role !== 'admin1' && user.role !== 'admin2') {
      throw new AppError('Only admins can resolve disputes', 403)
    }

    if (!resolution) {
      throw new AppError('Resolution is required', 400)
    }

    const dispute = await Dispute.findById(id)

    if (!dispute) {
      throw new AppError('Dispute not found', 404)
    }

    dispute.status = 'resolved'
    dispute.resolution = resolution
    dispute.resolvedBy = user._id
    dispute.resolvedAt = new Date()

    dispute.messages.push({
      senderId: user._id,
      senderRole: 'admin',
      message: `Dispute resolved: ${resolution}`,
      createdAt: new Date(),
    })

    await dispute.save()

    const order = await Order.findById(dispute.orderId)
    if (order && order.status !== 'cancelled') {
      order.status = 'cancelled'
      await order.save()
    }

    res.json({
      success: true,
      message: 'Dispute resolved successfully',
      data: dispute,
    })
  } catch (error) {
    next(error)
  }
})

disputesRouter.put('/:id/close', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params
    const user = req.user!

    if (user.role !== 'admin1' && user.role !== 'admin2') {
      throw new AppError('Only admins can close disputes', 403)
    }

    const dispute = await Dispute.findById(id).populate('orderId', 'isDeleted')

    if (!dispute) {
      throw new AppError('Dispute not found', 404)
    }

    const order = dispute.orderId as any
    if (order?.isDeleted) {
      throw new AppError('Cannot close dispute on a deleted order. This dispute should remain open.', 403)
    }

    dispute.status = 'closed'
    await dispute.save()

    res.json({
      success: true,
      message: 'Dispute closed successfully',
      data: dispute,
    })
  } catch (error) {
    next(error)
  }
})

export default disputesRouter
