import mongoose, { Schema, Document } from 'mongoose'

export interface IOrderItem {
  productId: mongoose.Types.ObjectId
  name: string
  price: string
  quantity: number
  image?: string
}

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId
  orderNumber: string
  items: IOrderItem[]
  totalAmount: string
  status: 'waiting_to_meet' | 'met_and_exchanged' | 'cancelled'
  buyerConfirmed: boolean
  sellerConfirmed: boolean
  disputeId?: mongoose.Types.ObjectId
  shippingAddress: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  isDeleted: boolean
  deletedAt?: Date
  deletedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    image: String,
  },
  { _id: false }
)

const orderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    items: [orderItemSchema],
    totalAmount: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['waiting_to_meet', 'met_and_exchanged', 'cancelled'],
      default: 'waiting_to_meet',
    },
    buyerConfirmed: {
      type: Boolean,
      default: false,
    },
    sellerConfirmed: {
      type: Boolean,
      default: false,
    },
    disputeId: {
      type: Schema.Types.ObjectId,
      ref: 'Dispute',
    },
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
)

// Generate order number before saving
orderSchema.pre('save', async function () {
  if (!this.orderNumber) {
    this.orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  }
})

orderSchema.index({ userId: 1, createdAt: -1 })

export const Order = mongoose.model<IOrder>('Order', orderSchema)
