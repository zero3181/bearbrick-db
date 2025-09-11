import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient, UserRole } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  const session = await getServerSession(req, res, authOptions)
  
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Only OWNER can manage users
  if (session.user.role !== UserRole.OWNER) {
    return res.status(403).json({ error: 'Insufficient permissions' })
  }

  try {
    if (req.method === 'GET') {
      // Get all users
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              createdBearbricks: true,
              uploadedImages: true,
              editRequests: true,
              recommendations: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      res.status(200).json({ users })
    } else if (req.method === 'PATCH') {
      // Update user role
      const { userId, role } = req.body

      if (!userId || !role) {
        return res.status(400).json({ error: 'Missing userId or role' })
      }

      if (!Object.values(UserRole).includes(role)) {
        return res.status(400).json({ error: 'Invalid role' })
      }

      // Prevent changing owner's role
      const targetUser = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' })
      }

      if (targetUser.role === UserRole.OWNER) {
        return res.status(400).json({ error: 'Cannot change owner role' })
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        }
      })

      res.status(200).json({ user: updatedUser })
    } else {
      res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Users fetch error:', error)
    res.status(500).json({
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    await prisma.$disconnect()
  }
}