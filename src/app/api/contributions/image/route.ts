import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

// Add image to bearbrick
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { bearbrickId, imageUrl, altText, isPrimary } = await request.json()

    // Validate required fields
    if (!bearbrickId || !imageUrl) {
      return NextResponse.json(
        { error: 'bearbrickId and imageUrl are required' },
        { status: 400 }
      )
    }

    // Check if bearbrick exists
    const bearbrick = await prisma.bearbrick.findUnique({
      where: { id: bearbrickId }
    })

    if (!bearbrick) {
      return NextResponse.json(
        { error: 'Bearbrick not found' },
        { status: 404 }
      )
    }

    // If this is set as primary, unset other primary images
    if (isPrimary) {
      await prisma.bearbrickImage.updateMany({
        where: { 
          bearbrickId: bearbrickId,
          isPrimary: true
        },
        data: { isPrimary: false }
      })
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create image record
    const image = await prisma.bearbrickImage.create({
      data: {
        url: imageUrl,
        altText: altText || `${bearbrick.name} image`,
        isPrimary: isPrimary || false,
        bearbrickId: bearbrickId,
        uploadedById: user.id
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      image
    })

  } catch (error) {
    console.error('Error adding image:', error)
    return NextResponse.json(
      { error: 'Failed to add image' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}