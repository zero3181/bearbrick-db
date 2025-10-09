import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (req.method === 'GET') {
    try {
      const bearbrick = await prisma.bearbrick.findUnique({
        where: { id: id as string },
        include: {
          images: {
            orderBy: [
              { isPrimary: 'desc' },
              { uploadedAt: 'asc' }
            ]
          },
          series: {
            select: {
              name: true,
            }
          }
        }
      })

      if (!bearbrick) {
        return res.status(404).json({ error: 'Bearbrick not found' })
      }

      // Map to simpler structure
      const mapped = {
        id: bearbrick.id,
        name: bearbrick.name,
        series: bearbrick.series?.name || null,
        size: bearbrick.sizePercentage,
        releaseDate: bearbrick.releaseDate,
        description: bearbrick.description,
        images: bearbrick.images,
      }

      return res.status(200).json(mapped)
    } catch (error) {
      console.error('Failed to fetch bearbrick:', error)
      return res.status(500).json({ error: 'Failed to fetch bearbrick' })
    } finally {
      await prisma.$disconnect()
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
