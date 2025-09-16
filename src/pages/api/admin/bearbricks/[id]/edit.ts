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

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { id } = req.query
    const {
      name,
      description,
      rarityPercentage,
      estimatedQuantity,
      sizePercentage,
      materialType,
      seriesId,
      categoryId,
      collaborationId
    } = req.body

    // Update bearbrick
    const updatedBearbrick = await prisma.bearbrick.update({
      where: { id: id as string },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(rarityPercentage !== undefined && { rarityPercentage: parseFloat(rarityPercentage) }),
        ...(estimatedQuantity !== undefined && { estimatedQuantity: parseInt(estimatedQuantity) }),
        ...(sizePercentage !== undefined && { sizePercentage: parseInt(sizePercentage) }),
        ...(materialType && { materialType }),
        ...(seriesId && { seriesId }),
        ...(categoryId && { categoryId }),
        ...(collaborationId !== undefined && { collaborationId: collaborationId || null })
      },
      include: {
        series: true,
        category: true,
        collaboration: true,
        images: true
      }
    })

    res.status(200).json({
      success: true,
      message: 'Bearbrick updated successfully',
      bearbrick: updatedBearbrick
    })

  } catch (error) {
    console.error('Admin bearbrick edit error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update bearbrick',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    await prisma.$disconnect()
  }
}