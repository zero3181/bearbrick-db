import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Find user and check if admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { action } = await request.json()

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve or reject' },
        { status: 400 }
      )
    }

    const { id } = await params

    // Get image request
    const imageRequest = await prisma.imageRequest.findUnique({
      where: { id }
    })

    if (!imageRequest) {
      return NextResponse.json(
        { error: 'Image request not found' },
        { status: 404 }
      )
    }

    if (action === 'approve') {
      // Set current primary images to false
      await prisma.bearbrickImage.updateMany({
        where: { 
          bearbrickId: imageRequest.bearbrickId,
          isPrimary: true 
        },
        data: { isPrimary: false }
      })

      // Add the new image as primary
      await prisma.bearbrickImage.create({
        data: {
          url: imageRequest.newImageUrl,
          altText: `Updated image`,
          isPrimary: true,
          bearbrickId: imageRequest.bearbrickId,
          uploadedById: imageRequest.requestedById
        }
      })

      // Update request status
      await prisma.imageRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedById: user.id
        }
      })
    } else {
      // Reject the request
      await prisma.imageRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewedById: user.id
        }
      })
    }

    return NextResponse.json({ 
      success: true,
      message: `Image request ${action}d successfully`
    })

  } catch (error) {
    console.error('Error processing image request:', error)
    return NextResponse.json(
      { error: 'Failed to process image request' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}