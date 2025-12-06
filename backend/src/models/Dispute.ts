import mongoose, { Schema, Document } from 'mongoose'

export interface IDisputeMessage {
  senderId: mongoose.Types.ObjectId
  senderRole: 'buyer' | 'seller' | 'admin'
  message: string
  createdAt: Date
}

export interface IDispute extends Document {
  orderId: mongoose.Types.ObjectId
  buyerId: mongoose.Types.ObjectId
  sellerId: mongoose.Types.ObjectId
  productIds: mongoose.Types.ObjectId[]
  reason: string
  status: 'open' | 'under_review' | 'resolved' | 'closed'
  messages: IDisputeMessage[]
  resolution?: string
  resolvedBy?: mongoose.Types.ObjectId
  resolvedAt?: Date
  isDeleted: boolean
  deletedAt?: Date
  deletedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const disputeMessageSchema = new Schema<IDisputeMessage>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['buyer', 'seller', 'admin'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
)

const disputeSchema = new Schema<IDispute>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    productIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Product',
    }],
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved', 'closed'],
      default: 'open',
    },
    messages: [disputeMessageSchema],
    resolution: {
      type: String,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
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

export const Dispute = mongoose.model<IDispute>('Dispute', disputeSchema)
