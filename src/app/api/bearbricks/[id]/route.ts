import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const bearbrick = await prisma.bearbrick.findUnique({
      where: { id },
      include: {
        series: true,
        category: true,
        collaboration: true,
        createdBy: {
          select: {
            id: true,
            name: true
          }
        },
        images: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: [
            { isPrimary: 'desc' },
            { uploadedAt: 'asc' }
          ]
        }
      }
    })

    if (!bearbrick) {
      return NextResponse.json(
        { error: 'Bearbrick not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(bearbrick)
    
  } catch (error) {
    console.error('Error fetching bearbrick:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bearbrick' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}