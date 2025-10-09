import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const bearbricks = await prisma.bearbrick.findMany({
        include: {
          images: {
            select: {
              id: true,
              url: true,
              isPrimary: true,
            },
          },
          series: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      // Map to simpler structure
      const mapped = bearbricks.map((b) => ({
        id: b.id,
        name: b.name,
        series: b.series?.name || null,
        size: b.sizePercentage,
        images: b.images,
      }))

      return res.status(200).json(mapped)
    } catch (error) {
      console.error('Failed to fetch bearbricks:', error)
      return res.status(500).json({ error: 'Failed to fetch bearbricks' })
    } finally {
      await prisma.$disconnect()
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
