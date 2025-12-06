import mongoose, { Schema, Document } from 'mongoose'

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId
  senderName: string
  senderEmail: string
  receiverId: mongoose.Types.ObjectId
  productId?: mongoose.Types.ObjectId
  subject: string
  message: string
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}

const messageSchema = new Schema<IMessage>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderEmail: {
      type: String,
      required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

messageSchema.index({ receiverId: 1, isRead: 1, createdAt: -1 })
messageSchema.index({ senderId: 1, createdAt: -1 })

export const Message = mongoose.model<IMessage>('Message', messageSchema)
