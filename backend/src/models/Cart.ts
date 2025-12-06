import mongoose, { Schema, Document } from 'mongoose'

export interface ICartItem {
  productId: mongoose.Types.ObjectId
  name: string
  price: string
  quantity: number
  image?: string
}

export interface ICart extends Document {
  userId: mongoose.Types.ObjectId
  items: ICartItem[]
  totalAmount: string
  createdAt: Date
  updatedAt: Date
}

const cartItemSchema = new Schema<ICartItem>(
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

const cartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    totalAmount: {
      type: String,
      default: '0.00',
    },
  },
  {
    timestamps: true,
  }
)

// Calculate total amount before saving
cartSchema.pre('save', function () {
  const total = this.items.reduce((sum, item) => {
    return sum + (parseFloat(item.price) * item.quantity)
  }, 0)
  this.totalAmount = total.toFixed(2)
})

export const Cart = mongoose.model<ICart>('Cart', cartSchema)
