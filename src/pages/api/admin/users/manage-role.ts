import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if user is OWNER (only OWNER can manage admin roles)
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!currentUser || currentUser.role !== 'OWNER') {
      return res.status(403).json({ error: 'OWNER access required' })
    }

    const { userId, newRole } = req.body

    if (!userId || !newRole) {
      return res.status(400).json({ error: 'User ID and new role are required' })
    }

    // Validate new role
    if (!['USER', 'ADMIN'].includes(newRole)) {
      return res.status(400).json({ error: 'Invalid role. Only USER and ADMIN roles can be assigned.' })
    }

    // Find target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Prevent changing OWNER role
    if (targetUser.role === 'OWNER') {
      return res.status(403).json({ error: 'Cannot change OWNER role' })
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true
      }
    })

    res.status(200).json({
      success: true,
      message: `User role updated successfully to ${newRole}`,
      user: updatedUser
    })

  } catch (error) {
    console.error('User role management error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update user role',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    await prisma.$disconnect()
  }
}