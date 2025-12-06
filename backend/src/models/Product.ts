import mongoose, { Schema, Document } from 'mongoose'

export interface IProduct extends Document {
  name: string
  description: string
  price: string
  category: string
  condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor'
  images: string[]
  sellerId: mongoose.Types.ObjectId
  sellerName: string
  sellerEmail: string
  status: 'available' | 'sold' | 'reserved'
  campus: string
  quantity: number  // This is the original listed quantity
  isDeleted: boolean
  deletedAt?: Date
  deletedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    condition: {
      type: String,
      enum: ['New', 'Like New', 'Good', 'Fair', 'Poor'],
      required: true,
    },
    images: {
      type: [String],
      default: [],
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sellerName: {
      type: String,
      required: true,
    },
    sellerEmail: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['available', 'sold'],
      default: 'available',
    },
    campus: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 0,
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

// Index for searching
productSchema.index({ name: 'text', description: 'text' })
productSchema.index({ category: 1, status: 1 })
productSchema.index({ sellerId: 1 })

export const Product = mongoose.model<IProduct>('Product', productSchema)
