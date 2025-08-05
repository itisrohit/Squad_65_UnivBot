import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import PFParser from 'pdf2json'
import { GoogleGenAI } from '@google/genai'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import { User } from '@/lib/models/User'
import { Document } from '@/lib/models/Document'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF, TXT, or DOCX files.' },
        { status: 400 }
      )
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    let extractedText = ''
    let chunks: string[] = []

    // Process file based on type
    if (file.type === 'application/pdf') {
      try {
        // Parse PDF using pdf2json (Node.js compatible)
        const pdfParser = new PFParser()
        
        // Create a promise-based wrapper for the event-driven pdf2json
        const parsePDF = (): Promise<string> => {
          return new Promise((resolve, reject) => {
            pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
              try {
                // Extract text from all pages
                const pageTexts: string[] = []
                
                if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
                  pdfData.Pages.forEach((page: any) => {
                    if (page.Texts && Array.isArray(page.Texts)) {
                      const pageText = page.Texts
                        .map((textObj: any) => {
                          // Decode the text content
                          return decodeURIComponent(textObj.R[0].T || '')
                        })
                        .join(' ')
                      
                      pageTexts.push(pageText)
                    }
                  })
                }
                
                const fullText = pageTexts.join('\n')
                resolve(fullText)
              } catch (error) {
                reject(error)
              }
            })
            
            pdfParser.on('pdfParser_dataError', (error: any) => {
              reject(error)
            })
            
            // Parse the PDF buffer
            pdfParser.parseBuffer(buffer)
          })
        }
        
        extractedText = await parsePDF()
        
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError)
        return NextResponse.json(
          { error: 'Failed to parse PDF file. Please ensure it contains readable text.' },
          { status: 400 }
        )
      }
    } else if (file.type === 'text/plain') {
      // Extract text from plain text file
      extractedText = buffer.toString('utf-8')
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        // Extract text from DOCX
        const result = await mammoth.extractRawText({ buffer })
        extractedText = result.value
      } catch (docxError) {
        console.error('DOCX parsing error:', docxError)
        return NextResponse.json(
          { error: 'Failed to parse DOCX file. Please ensure it contains readable text.' },
          { status: 400 }
        )
      }
    }

    // Clean and validate extracted text
    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text content could be extracted from the file.' },
        { status: 400 }
      )
    }

    // Clean the text
    const cleanedText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // Split text into chunks using LangChain (RAG pipeline step 1)
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', ' ', '']
    })

    chunks = await textSplitter.splitText(cleanedText)

    // Filter out empty chunks
    chunks = chunks.filter(chunk => chunk.trim().length > 0)

    // Generate embeddings for chunks using Gemini (RAG pipeline step 2)
    let embeddings: number[][] = []
    let embeddingError: Error | null = null

    try {
      // Get the user's Gemini API key from the session
      const session = await getServerSession(authOptions)
      if (!session?.user?.email) {
        throw new Error('User not authenticated')
      }

      // Get user's Gemini API key from database
      await dbConnect()
      const user = await User.findOne(
        { email: session.user.email },
        '+geminiApiKey'
      )

      if (!user?.geminiApiKey) {
        throw new Error('Gemini API key not configured')
      }

      // Initialize Google GenAI client with API key
      const ai = new GoogleGenAI({
        apiKey: user.geminiApiKey
      })

      // Generate embeddings for all chunks at once
      const embeddingResponse = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: chunks
        // Note: outputDimensionality: 768 is supported in the API but not in TypeScript types
        // We'll manually truncate to 768 dimensions for efficiency
      })

      // Extract embedding values and normalize them
      if (embeddingResponse.embeddings) {
        embeddings = embeddingResponse.embeddings.map(embedding => {
          const values = embedding.values || []
          // Truncate to 768 dimensions for efficiency (as per Google AI docs)
          const truncatedValues = values.slice(0, 768)
          // Normalize the embedding for better similarity calculations
          const magnitude = Math.sqrt(truncatedValues.reduce((sum, val) => sum + val * val, 0))
          return truncatedValues.map(val => val / magnitude)
        })
      }

    } catch (error) {
      embeddingError = error instanceof Error ? error : new Error('Unknown embedding error')
      // Continue without embeddings for now, but log the error
    }

    // Prepare response with RAG pipeline information
    const response: {
      success: boolean
      fileName: string
      fileSize: number
      fileType: string
      extractedTextLength: number
      chunkCount: number
      embeddingCount: number
      hasEmbeddings: boolean
      embeddingError: string | null
      chunks: string[]
      embeddings: number[][]
      metadata: {
        originalText: string
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
      documentId?: string
    } = {
      success: true,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      extractedTextLength: cleanedText.length,
      chunkCount: chunks.length,
      embeddingCount: embeddings.length,
      hasEmbeddings: embeddings.length > 0,
      embeddingError: embeddingError ? embeddingError.message : null,
      chunks: chunks,
      embeddings: embeddings, // Include embeddings in response
      metadata: {
        originalText: cleanedText.substring(0, 500) + (cleanedText.length > 500 ? '...' : ''),
        processingTime: Date.now(),
        ragPipeline: {
          stage: embeddings.length > 0 ? 'Embeddings Generated' : 'Document Processing Complete',
          nextSteps: embeddings.length > 0 ? ['Storage', 'Retrieval Setup'] : ['Vector Embedding', 'Storage', 'Retrieval Setup'],
          embeddingConfig: {
            model: 'gemini-embedding-001',
            normalized: true
          }
        }
      }
    }

    // Save document to database
    try {
      const session = await getServerSession(authOptions)
      if (!session?.user?.email) {
        throw new Error('User not authenticated')
      }

      // Create document record
      const documentData = {
        userId: session.user.email,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        originalText: cleanedText,
        chunks: chunks,
        embeddings: embeddings,
        metadata: {
          chunkCount: chunks.length,
          embeddingCount: embeddings.length,
          processingTime: Date.now(),
          ragPipeline: {
            stage: embeddings.length > 0 ? 'Embeddings Generated' : 'Document Processing Complete',
            nextSteps: embeddings.length > 0 ? ['Storage', 'Retrieval Setup'] : ['Vector Embedding', 'Storage', 'Retrieval Setup'],
            embeddingConfig: {
              model: 'gemini-embedding-001',
              normalized: true
            }
          }
        }
      }

      const savedDocument = await Document.create(documentData)
      
      // Add document ID to response
      response.documentId = savedDocument._id.toString()

    } catch (dbError) {
      console.error('❌ Database save error:', dbError)
      // Continue with response even if database save fails
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ RAG Pipeline Error:', error)
    return NextResponse.json(
      { error: 'Failed to process file. Please try again.' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'RAG Upload endpoint is ready. Use POST to upload files.',
      supportedFormats: ['TXT', 'DOCX', 'PDF'],
      ragPipeline: {
        currentStage: 'Document Processing',
        nextStages: ['Vector Embedding', 'Retrieval', 'Generation']
      }
    },
    { status: 200 }
  )
} 