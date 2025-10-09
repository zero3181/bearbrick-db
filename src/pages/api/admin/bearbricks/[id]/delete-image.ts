import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const password = req.headers.authorization?.replace('Bearer ', '')
  if (password !== '4321') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { imageId } = req.body

    await prisma.bearbrickImage.delete({
      where: { id: imageId }
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Delete image error:', error)
    return res.status(500).json({ error: 'Failed to delete image' })
  } finally {
    await prisma.$disconnect()
  }
}
