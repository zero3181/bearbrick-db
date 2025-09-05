import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const series = await prisma.series.findMany({
        include: {
          _count: {
            select: { bearbricks: true }
          }
        },
        orderBy: { number: 'asc' }
      })

      res.status(200).json(series)
    } else {
      res.setHeader('Allow', ['GET'])
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Error fetching series:', error)
    res.status(500).json({ error: 'Failed to fetch series' })
  } finally {
    await prisma.$disconnect()
  }
}