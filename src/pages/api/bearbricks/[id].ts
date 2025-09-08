import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { id } = req.query

      const bearbrick = await prisma.bearbrick.findUnique({
        where: { id: id as string },
        include: {
          series: true,
          category: true,
          collaboration: true,
          createdBy: {
            select: {
              id: true,
              name: true
            }
          },
          images: {
            include: {
              uploadedBy: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: [
              { isPrimary: 'desc' },
              { uploadedAt: 'asc' }
            ]
          },
          _count: {
            select: {
              recommendations: true
            }
          }
        }
      })

      if (!bearbrick) {
        return res.status(404).json({ error: 'Bearbrick not found' })
      }

      res.status(200).json(bearbrick)
    } else {
      res.setHeader('Allow', ['GET'])
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Error fetching bearbrick:', error)
    res.status(500).json({ error: 'Failed to fetch bearbrick' })
  } finally {
    await prisma.$disconnect()
  }
}