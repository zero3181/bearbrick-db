import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

// Submit edit request
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { bearbrickId, type, description, oldData, newData } = await request.json()

    // Validate required fields
    if (!bearbrickId || !type || !newData) {
      return NextResponse.json(
        { error: 'bearbrickId, type, and newData are required' },
        { status: 400 }
      )
    }

    // Check if bearbrick exists
    const bearbrick = await prisma.bearbrick.findUnique({
      where: { id: bearbrickId },
      include: {
        series: true,
        category: true,
        collaboration: true
      }
    })

    if (!bearbrick) {
      return NextResponse.json(
        { error: 'Bearbrick not found' },
        { status: 404 }
      )
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

    // Create edit request
    const editRequest = await prisma.editRequest.create({
      data: {
        type: type as any, // Type will be validated by Prisma
        description,
        oldData: oldData || {},
        newData,
        bearbrickId,
        requestedById: user.id
      },
      include: {
        bearbrick: {
          select: {
            id: true,
            name: true
          }
        },
        requestedBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      editRequest
    })

  } catch (error) {
    console.error('Error creating edit request:', error)
    return NextResponse.json(
      { error: 'Failed to create edit request' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}