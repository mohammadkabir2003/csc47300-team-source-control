import mongoose, { Schema, Document } from 'mongoose'

export interface IPayment extends Document {
  orderId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  amount: string
  currency: string
  paymentMethod: 'credit_card' | 'debit_card' | 'paypal' | 'venmo' | 'cash' | 'zelle'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled'
  transactionId?: string
  paymentGateway?: string
  cardDetails?: {
    cardNumber?: string
    cardHolderName?: string
    expiryDate?: string
    cvv?: string
    lastFourDigits: string
    cardType: string
    expiryMonth?: number
    expiryYear?: number
  }
  billingAddress?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  paymentDate?: Date
  refundDate?: Date
  refundAmount?: string
  failureReason?: string
  metadata?: any
  isDeleted: boolean
  deletedAt?: Date
  deletedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const paymentSchema = new Schema<IPayment>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'venmo', 'cash', 'zelle'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
      index: true,
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    paymentGateway: String,
    cardDetails: {
      cardNumber: String,
      cardHolderName: String,
      expiryDate: String,
      cvv: String,
      lastFourDigits: String,
      cardType: String,
      expiryMonth: Number,
      expiryYear: Number,
    },
    billingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    paymentDate: Date,
    refundDate: Date,
    refundAmount: String,
    failureReason: String,
    metadata: Schema.Types.Mixed,
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: Date,
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
)

paymentSchema.pre('save', function () {
  if (!this.transactionId && this.status === 'completed') {
    this.transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  }
})

paymentSchema.index({ userId: 1, createdAt: -1 })
paymentSchema.index({ orderId: 1 })
paymentSchema.index({ status: 1, createdAt: -1 })

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema)
