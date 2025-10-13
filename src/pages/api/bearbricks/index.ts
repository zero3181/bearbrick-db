import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { series } = req.query

      const bearbricks = await prisma.bearbrick.findMany({
        where: series && typeof series === 'string' ? {
          series: {
            name: series,
          },
        } : undefined,
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
      // Return empty array instead of error object to prevent client-side crashes
      return res.status(200).json([])
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
