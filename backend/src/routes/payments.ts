import express from 'express'
import { Payment } from '../models/Payment.js'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { AppError } from '../middleware/errorHandler.js'
import { authMiddleware } from '../middleware/auth.js'

export const paymentsRouter = express.Router()

paymentsRouter.use(authMiddleware)

paymentsRouter.post('/process', async (req, res, next) => {
  try {
    const { orderId, paymentMethod, cardDetails, billingAddress } = req.body
    const userId = (req as any).user._id

    if (!orderId || !paymentMethod) {
      throw new AppError('Order ID and payment method are required', 400)
    }

    const order = await Order.findOne({ _id: orderId, userId, isDeleted: false })
    if (!order) {
      throw new AppError('Order not found', 404)
    }

    if (order.status === 'cancelled') {
      throw new AppError('Cannot process payment for a cancelled order', 400)
    }

    if (order.status === 'met_and_exchanged') {
      throw new AppError('Order is already completed', 400)
    }

    const existingPayment = await Payment.findOne({ orderId, isDeleted: false })
    if (existingPayment && existingPayment.status === 'completed') {
      throw new AppError('Payment already completed for this order', 400)
    }

    const payment = new Payment({
      orderId,
      userId,
      amount: order.totalAmount,
      currency: 'USD',
      paymentMethod,
      status: 'completed',
      paymentDate: new Date(),
      transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      cardDetails: cardDetails ? {
        lastFourDigits: cardDetails.cardNumber ? cardDetails.cardNumber.slice(-4) : '0000',
        cardType: cardDetails.cardType || 'Visa',
        expiryMonth: cardDetails.expiryMonth,
        expiryYear: cardDetails.expiryYear,
      } : undefined,
      billingAddress,
    })

    await order.save()
    await payment.save()

    res.status(201).json({
      success: true,
      message: 'Payment processed successfully (MOCK - No real charges)',
      data: {
        payment: {
          id: payment._id,
          transactionId: payment.transactionId,
          status: payment.status,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          paymentDate: payment.paymentDate,
        },
      },
    })
  } catch (error) {
    next(error)
  }
})

paymentsRouter.get('/order/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params
    const userId = (req as any).user._id

    const payment = await Payment.findOne({ 
      orderId, 
      userId, 
      isDeleted: false 
    })
      .populate('orderId', 'orderNumber totalAmount status')

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

paymentsRouter.get('/my-payments', async (req, res, next) => {
  try {
    const userId = (req as any).user._id
    const { status, page = 1, limit = 20 } = req.query

    const query: any = { userId, isDeleted: false }
    if (status) {
      query.status = status
    }

    const payments = await Payment.find(query)
      .populate('orderId', 'orderNumber totalAmount status items')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))

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

paymentsRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = (req as any).user._id

    const payment = await Payment.findOne({ 
      _id: id, 
      userId, 
      isDeleted: false 
    })
      .populate('orderId', 'orderNumber totalAmount status items')
      .populate('userId', 'firstName lastName email')

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

paymentsRouter.post('/:id/refund', async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = (req as any).user._id
    const { reason } = req.body

    const payment = await Payment.findOne({ 
      _id: id, 
      userId, 
      isDeleted: false 
    })

    if (!payment) {
      throw new AppError('Payment not found', 404)
    }

    if (payment.status === 'refunded') {
      throw new AppError('Payment already refunded', 400)
    }

    if (payment.status !== 'completed') {
      throw new AppError('Only completed payments can be refunded', 400)
    }

    payment.status = 'refunded'
    payment.refundDate = new Date()
    payment.refundAmount = payment.amount
    payment.failureReason = reason || 'Customer requested refund'

    await payment.save()

    const order = await Order.findById(payment.orderId)
    if (order && order.status !== 'cancelled') {
      order.status = 'cancelled'
      await order.save()
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

paymentsRouter.get('/stats/summary', async (req, res, next) => {
  try {
    const userId = (req as any).user._id

    const [totalSpent, completedPayments, pendingPayments, failedPayments] = await Promise.all([
      Payment.aggregate([
        { $match: { userId, status: 'completed', isDeleted: false } },
        { $addFields: { amountNum: { $toDouble: '$amount' } } },
        { $group: { _id: null, total: { $sum: '$amountNum' } } },
      ]),
      Payment.countDocuments({ userId, status: 'completed', isDeleted: false }),
      Payment.countDocuments({ userId, status: 'pending', isDeleted: false }),
      Payment.countDocuments({ userId, status: 'failed', isDeleted: false }),
    ])

    res.json({
      success: true,
      data: {
        totalSpent: (totalSpent[0]?.total || 0).toFixed(2),
        completedPayments,
        pendingPayments,
        failedPayments,
      },
    })
  } catch (error) {
    next(error)
  }
})
