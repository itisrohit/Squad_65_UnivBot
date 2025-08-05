import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import PFParser from 'pdf2json'

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

    // Console log the processed data (RAG pipeline monitoring)
    console.log('🔍 RAG Pipeline - Document Processing Complete:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      extractedTextLength: cleanedText.length,
      chunkCount: chunks.length,
      processingTime: new Date().toISOString(),
      ragStatus: {
        retrieval: 'Ready for vector embedding',
        augmentation: 'Chunks prepared for context',
        generation: 'Ready for LLM integration'
      }
    })

    // Prepare response with RAG pipeline information
    const response = {
      success: true,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      extractedTextLength: cleanedText.length,
      chunkCount: chunks.length,
      chunks: chunks,
      metadata: {
        originalText: cleanedText.substring(0, 500) + (cleanedText.length > 500 ? '...' : ''),
        processingTime: Date.now(),
        ragPipeline: {
          stage: 'Document Processing Complete',
          nextSteps: ['Vector Embedding', 'Storage', 'Retrieval Setup']
        }
      }
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