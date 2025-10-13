import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const series = await prisma.series.findMany({
      include: {
        _count: {
          select: { bearbricks: true }
        }
      },
      orderBy: { name: 'desc' }
    })

    return res.status(200).json(series)
  } catch (error) {
    console.error('Error fetching series:', error)
    return res.status(500).json({ error: 'Failed to fetch series' })
  }
}