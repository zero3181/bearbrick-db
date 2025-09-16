import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from "@/lib/auth"
import { PrismaClient, UserRole, RequestStatus } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Only admins and owners can review edit requests
  if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.OWNER) {
    return res.status(403).json({ error: 'Insufficient permissions' })
  }

  try {
    const { id } = req.query
    const { status, reviewNote } = req.body

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid edit request ID' })
    }

    if (!status || !Object.values(RequestStatus).includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    // Get the edit request
    const editRequest = await prisma.editRequest.findUnique({
      where: { id },
      include: {
        bearbrick: true,
      }
    })

    if (!editRequest) {
      return res.status(404).json({ error: 'Edit request not found' })
    }

    if (editRequest.status !== RequestStatus.PENDING) {
      return res.status(400).json({ error: 'Edit request has already been reviewed' })
    }

    // Start a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Update edit request status
      const updatedRequest = await prisma.editRequest.update({
        where: { id },
        data: {
          status,
          reviewedAt: new Date(),
          reviewedById: session.user.id,
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

      // If approved, apply the changes to the bearbrick
      if (status === RequestStatus.APPROVED) {
        const newData = editRequest.newData as any
        
        await prisma.bearbrick.update({
          where: { id: editRequest.bearbrickId },
          data: {
            name: newData.name || undefined,
            sizePercentage: newData.sizePercentage || undefined,
            releaseDate: newData.releaseDate ? new Date(newData.releaseDate) : undefined,
            rarityPercentage: newData.rarityPercentage || undefined,
            estimatedQuantity: newData.estimatedQuantity || undefined,
            materialType: newData.materialType || undefined,
            description: newData.description || undefined,
            seriesId: newData.seriesId || undefined,
            categoryId: newData.categoryId || undefined,
            collaborationId: newData.collaborationId || undefined,
          }
        })
      }

      return updatedRequest
    })

    res.status(200).json({ 
      success: true, 
      editRequest: result,
      message: status === RequestStatus.APPROVED ? 'Edit request approved and changes applied' : 'Edit request rejected'
    })
  } catch (error) {
    console.error('Review edit request error:', error)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    await prisma.$disconnect()
  }
}