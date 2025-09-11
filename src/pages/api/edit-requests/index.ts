import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const isAdminOrOwner = session.user.role === UserRole.ADMIN || session.user.role === UserRole.OWNER
    const { status, userId } = req.query

    let whereClause: any = {}

    // If not admin/owner, only show user's own requests
    if (!isAdminOrOwner) {
      whereClause.requestedById = session.user.id
    } else {
      // Admin/Owner can filter by user
      if (userId) {
        whereClause.requestedById = userId
      }
    }

    // Filter by status if provided
    if (status) {
      whereClause.status = status
    }

    const editRequests = await prisma.editRequest.findMany({
      where: whereClause,
      include: {
        bearbrick: {
          include: {
            series: true,
            category: true,
            collaboration: true,
          }
        },
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    res.status(200).json({ editRequests })
  } catch (error) {
    console.error('Fetch edit requests error:', error)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    await prisma.$disconnect()
  }
}