import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  email: string
  name: string
  geminiApiKey?: string
  createdAt: Date
  updatedAt: Date
  lastActive: Date
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  geminiApiKey: {
    type: String,
    trim: true,
    select: false // Don't include in queries by default for security
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// Prevent mongoose from creating the model multiple times
export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema) 