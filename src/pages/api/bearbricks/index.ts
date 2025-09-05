import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { page = '1', limit = '20' } = req.query
      const pageNum = parseInt(page as string)
      const limitNum = parseInt(limit as string)
      const skip = (pageNum - 1) * limitNum

      const [bearbricks, total] = await Promise.all([
        prisma.bearbrick.findMany({
          skip,
          take: limitNum,
          include: {
            series: true,
            category: true,
            images: {
              where: { isPrimary: true },
              take: 1
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.bearbrick.count()
      ])

      res.status(200).json({
        bearbricks,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      })
    } else {
      res.setHeader('Allow', ['GET'])
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Error fetching bearbricks:', error)
    res.status(500).json({ error: 'Failed to fetch bearbricks' })
  } finally {
    await prisma.$disconnect()
  }
}