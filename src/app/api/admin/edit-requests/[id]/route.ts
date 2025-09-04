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
    const { id } = await params

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve or reject' },
        { status: 400 }
      )
    }

    // Get edit request
    const editRequest = await prisma.editRequest.findUnique({
      where: { id },
      include: {
        bearbrick: true
      }
    })

    if (!editRequest) {
      return NextResponse.json(
        { error: 'Edit request not found' },
        { status: 404 }
      )
    }

    if (action === 'approve') {
      // Apply the changes to the bearbrick
      const newData = editRequest.newData as any
      
      await prisma.bearbrick.update({
        where: { id: editRequest.bearbrickId },
        data: {
          ...(newData.name && { name: newData.name }),
          ...(newData.description && { description: newData.description }),
          ...(newData.sizePercentage && { sizePercentage: newData.sizePercentage }),
          ...(newData.rarityPercentage && { rarityPercentage: newData.rarityPercentage }),
          ...(newData.estimatedQuantity && { estimatedQuantity: newData.estimatedQuantity }),
          ...(newData.materialType && { materialType: newData.materialType })
        }
      })

      // Update request status
      await prisma.editRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedById: user.id
        }
      })
    } else {
      // Reject the request
      await prisma.editRequest.update({
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
      message: `Edit request ${action}d successfully`
    })

  } catch (error) {
    console.error('Error processing edit request:', error)
    return NextResponse.json(
      { error: 'Failed to process edit request' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}