import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from "@/lib/auth"
import { PrismaClient, EditRequestType } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { bearbrickId, type, description, newData } = req.body

    if (!bearbrickId || !type || !newData) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Validate edit request type
    if (!Object.values(EditRequestType).includes(type)) {
      return res.status(400).json({ error: 'Invalid edit request type' })
    }

    // Check if bearbrick exists
    const bearbrick = await prisma.bearbrick.findUnique({
      where: { id: bearbrickId },
      include: {
        series: true,
        category: true,
        collaboration: true,
      }
    })

    if (!bearbrick) {
      return res.status(404).json({ error: 'Bearbrick not found' })
    }

    // Store old data for comparison
    const oldData = {
      name: bearbrick.name,
      sizePercentage: bearbrick.sizePercentage,
      releaseDate: bearbrick.releaseDate,
      rarityPercentage: bearbrick.rarityPercentage,
      estimatedQuantity: bearbrick.estimatedQuantity,
      materialType: bearbrick.materialType,
      description: bearbrick.description,
      seriesId: bearbrick.seriesId,
      categoryId: bearbrick.categoryId,
      collaborationId: bearbrick.collaborationId,
    }

    // Create edit request
    const editRequest = await prisma.editRequest.create({
      data: {
        type,
        description,
        oldData,
        newData,
        bearbrickId,
        requestedById: session.user.id,
      },
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
          }
        }
      }
    })

    res.status(201).json({ 
      success: true, 
      editRequest,
      message: 'Edit request submitted successfully' 
    })
  } catch (error) {
    console.error('Create edit request error:', error)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    await prisma.$disconnect()
  }
}