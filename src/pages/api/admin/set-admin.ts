import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check if this is the first user (make them super admin) or if they're already admin
    const userCount = await prisma.user.count()
    const isFirstUser = userCount === 1
    const isCurrentAdmin = currentUser.role === 'ADMIN'

    if (!isFirstUser && !isCurrentAdmin) {
      return res.status(403).json({ error: 'Only existing admins can set new admins' })
    }

    const { email, role } = req.body

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' })
    }

    if (!['USER', 'CONTRIBUTOR', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be USER, CONTRIBUTOR, or ADMIN' })
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })

    res.status(200).json({
      success: true,
      message: `User ${updatedUser.name} role updated to ${role}`,
      user: updatedUser
    })

  } catch (error) {
    console.error('Set admin error:', error)
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return res.status(404).json({ error: 'User with this email not found' })
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update user role',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    await prisma.$disconnect()
  }
}