import { Document } from '@/lib/models/Document'

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length')
  }
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  
  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)
  
  if (normA === 0 || normB === 0) {
    return 0
  }
  
  return dotProduct / (normA * normB)
}

/**
 * Search for similar documents using vector similarity
 */
export async function searchSimilarDocuments(
  queryEmbedding: number[],
  userId: string,
  limit: number = 5,
  similarityThreshold: number = 0.7
): Promise<Array<{
  documentId: string
  fileName: string
  chunkIndex: number
  chunk: string
  similarity: number
  metadata: any
}>> {
  try {
    // Get all documents for the user
    const documents = await Document.find({ userId })
    
    const results: Array<{
      documentId: string
      fileName: string
      chunkIndex: number
      chunk: string
      similarity: number
      metadata: any
    }> = []
    
    // Calculate similarity for each chunk in each document
    for (const document of documents) {
      if (document.embeddings && document.embeddings.length > 0) {
        for (let i = 0; i < document.embeddings.length; i++) {
          const chunkEmbedding = document.embeddings[i]
          const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding)
          
          if (similarity >= similarityThreshold) {
            results.push({
              documentId: document._id.toString(),
              fileName: document.fileName,
              chunkIndex: i,
              chunk: document.chunks[i],
              similarity,
              metadata: document.metadata
            })
          }
        }
      }
    }
    
    // Sort by similarity (highest first) and limit results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      
  } catch (error) {
    throw error
  }
}

/**
 * Get all documents for a user
 */
export async function getUserDocuments(userId: string): Promise<Array<{
  documentId: string
  fileName: string
  fileType: string
  fileSize: number
  chunkCount: number
  embeddingCount: number
  createdAt: Date
  metadata: any
}>> {
  try {
    const documents = await Document.find({ userId })
      .select('fileName fileType fileSize chunkCount embeddingCount createdAt metadata')
      .sort({ createdAt: -1 })
    
    return documents.map(doc => ({
      documentId: doc._id.toString(),
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      chunkCount: doc.metadata.chunkCount,
      embeddingCount: doc.metadata.embeddingCount,
      createdAt: doc.createdAt,
      metadata: doc.metadata
    }))
  } catch (error) {
    throw error
  }
}

/**
 * Delete a document by ID
 */
export async function deleteDocument(documentId: string, userId: string): Promise<boolean> {
  try {
    const result = await Document.findOneAndDelete({ _id: documentId, userId })
    return !!result
  } catch (error) {
    throw error
  }
} 