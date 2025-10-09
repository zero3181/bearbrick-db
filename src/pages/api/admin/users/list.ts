import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if user is OWNER or ADMIN
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'OWNER')) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    // Get all users with basic info
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdBearbricks: true,
            uploadedImages: true,
            editRequests: true
          }
        }
      },
      orderBy: [
        { role: 'desc' }, // OWNER first, then ADMIN, then USER
        { name: 'asc' }
      ]
    })

    res.status(200).json({
      success: true,
      users,
      total: users.length,
      currentUser: {
        id: currentUser.id,
        role: currentUser.role
      }
    })

  } catch (error) {
    console.error('User list error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    await prisma.$disconnect()
  }
}