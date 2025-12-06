import mongoose, { Schema, Document } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUser extends Document {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  role: 'user' | 'admin1' | 'admin2'
  isEmailVerified: boolean
  isBanned: boolean
  bannedAt?: Date
  bannedBy?: mongoose.Types.ObjectId
  banReason?: string
  isDeleted: boolean
  deletedAt?: Date
  deletedBy?: mongoose.Types.ObjectId
  securityQuestion: string
  securityAnswer: string
  createdAt: Date
  updatedAt: Date
  comparePassword(candidatePassword: string): Promise<boolean>
  compareSecurityAnswer(answer: string): Promise<boolean>
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin1', 'admin2'],
      default: 'user',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    bannedAt: {
      type: Date,
    },
    bannedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    banReason: {
      type: String,
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
    securityQuestion: {
      type: String,
      required: true,
      default: 'What is your favorite color?',
    },
    securityAnswer: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// Hash password and security answer before saving
userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
  }
  
  if (this.isModified('securityAnswer')) {
    const salt = await bcrypt.genSalt(10)
    this.securityAnswer = await bcrypt.hash(this.securityAnswer.toLowerCase().trim(), salt)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

// Compare security answer method
userSchema.methods.compareSecurityAnswer = async function (answer: string): Promise<boolean> {
  return bcrypt.compare(answer.toLowerCase().trim(), this.securityAnswer)
}

export const User = mongoose.model<IUser>('User', userSchema)
