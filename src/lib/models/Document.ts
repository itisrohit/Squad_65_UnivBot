import mongoose, { Schema, Document as MongooseDocument } from 'mongoose'

export interface IDocument extends MongooseDocument {
  userId: string
  fileName: string
  fileType: string
  fileSize: number
  originalText: string
  chunks: string[]
  embeddings: number[][]
  metadata: {
    chunkCount: number
    embeddingCount: number
    processingTime: number
    ragPipeline: {
      stage: string
      nextSteps: string[]
      embeddingConfig: {
        model: string
        normalized: boolean
      }
    }
  }
  createdAt: Date
  updatedAt: Date
}

const DocumentSchema = new Schema<IDocument>({
  userId: {
    type: String,
    required: true,
    index: true // Index for fast user-based queries
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  originalText: {
    type: String,
    required: true
  },
  chunks: [{
    type: String,
    required: true
  }],
  embeddings: [[{
    type: Number,
    required: true
  }]],
  metadata: {
    chunkCount: {
      type: Number,
      required: true
    },
    embeddingCount: {
      type: Number,
      required: true
    },
    processingTime: {
      type: Number,
      required: true
    },
    ragPipeline: {
      stage: {
        type: String,
        required: true
      },
      nextSteps: [{
        type: String
      }],
      embeddingConfig: {
        model: {
          type: String,
          required: true
        },
        normalized: {
          type: Boolean,
          required: true
        }
      }
    }
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  // Optimize for vector operations
  autoIndex: true,
  // Use strict mode for better performance
  strict: true
})

// Compound index for efficient user + file queries
DocumentSchema.index({ userId: 1, fileName: 1 })

// Index for embedding similarity searches (if needed)
DocumentSchema.index({ 'embeddings': 1 })

// Text index for full-text search on chunks
DocumentSchema.index({ chunks: 'text' })

// Index for processing time queries
DocumentSchema.index({ 'metadata.processingTime': -1 })

export const Document = mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema) 