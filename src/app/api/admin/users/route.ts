import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })
    }

    // Only OWNER can list users
    if (session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'OWNER role required.' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdBearbricks: true,
            uploadedImages: true,
            editRequests: true,
            recommendations: true,
            submittedImages: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ users })

  } catch (error) {
    console.error('Users fetch error:', error)
    return NextResponse.json(
      { error: 'An error occurred while fetching the user list.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}