import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import { User } from '@/lib/models/User'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { geminiApiKey } = await request.json()

    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is required' },
        { status: 400 }
      )
    }

    await dbConnect()

    // Update user with Gemini API key
    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      { geminiApiKey },
      { new: true, select: '+geminiApiKey' }
    )

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Gemini API key saved successfully'
    })

  } catch (error) {
    console.error('Error saving Gemini API key:', error)
    return NextResponse.json(
      { error: 'Failed to save Gemini API key' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await dbConnect()

    // Get user with Gemini API key
    const user = await User.findOne(
      { email: session.user.email },
      '+geminiApiKey'
    )

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      hasApiKey: !!user.geminiApiKey
    })

  } catch (error) {
    console.error('Error retrieving Gemini API key status:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve API key status' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await dbConnect()

    // Remove Gemini API key from user
    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      { $unset: { geminiApiKey: 1 } },
      { new: true }
    )

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Gemini API key deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting Gemini API key:', error)
    return NextResponse.json(
      { error: 'Failed to delete Gemini API key' },
      { status: 500 }
    )
  }
} 