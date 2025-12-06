import mongoose, { Schema, Document } from 'mongoose'

export interface IReview extends Document {
  productId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  userName: string
  rating: number
  comment: string
  isVerifiedPurchase: boolean
  editedByAdmin?: mongoose.Types.ObjectId
  editedAt?: Date
  isDeleted: boolean
  deletedAt?: Date
  deletedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const reviewSchema = new Schema<IReview>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    editedByAdmin: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    editedAt: {
      type: Date,
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

reviewSchema.index({ productId: 1, userId: 1 }, { unique: true })
reviewSchema.index({ productId: 1, createdAt: -1 })

export const Review = mongoose.model<IReview>('Review', reviewSchema)
