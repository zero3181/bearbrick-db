import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Please login first' })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found in database' })
    }

    // Check if user is already admin
    if (user.role === 'ADMIN') {
      return res.status(200).json({
        success: true,
        message: 'You are already an admin!',
        user: {
          name: user.name,
          email: user.email,
          role: user.role
        }
      })
    }

    // Update user to admin
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { role: 'ADMIN' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })

    res.status(200).json({
      success: true,
      message: 'Congratulations! You are now an admin.',
      user: updatedUser
    })

  } catch (error) {
    console.error('Quick admin setup error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to set admin role',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    await prisma.$disconnect()
  }
}