import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const categories = await prisma.category.findMany({
        include: {
          _count: {
            select: { bearbricks: true }
          }
        },
        orderBy: { name: 'asc' }
      })

      res.status(200).json(categories)
    } else {
      res.setHeader('Allow', ['GET'])
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Error fetching categories:', error)
    res.status(500).json({ error: 'Failed to fetch categories' })
  } finally {
    await prisma.$disconnect()
  }
}