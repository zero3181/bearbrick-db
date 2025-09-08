import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { 
        page = '1', 
        limit = '20', 
        series, 
        category, 
        search 
      } = req.query
      const pageNum = parseInt(page as string)
      const limitNum = parseInt(limit as string)
      const skip = (pageNum - 1) * limitNum

      // Build where clause
      const where: any = {}
      
      if (series) {
        where.series = {
          number: parseInt(series as string)
        }
      }
      
      if (category) {
        where.category = {
          name: category as string
        }
      }
      
      if (search) {
        where.name = {
          contains: search as string,
          mode: 'insensitive'
        }
      }

      const [bearbricks, total] = await Promise.all([
        prisma.bearbrick.findMany({
          where,
          skip,
          take: limitNum,
          include: {
            series: true,
            category: true,
            collaboration: true,
            images: {
              where: { isPrimary: true },
              take: 1
            },
            _count: {
              select: {
                recommendations: true
              }
            }
          },
          orderBy: { id: 'asc' }
        }),
        prisma.bearbrick.count({ where })
      ])

      const totalPages = Math.ceil(total / limitNum)
      
      res.status(200).json({
        data: bearbricks,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
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