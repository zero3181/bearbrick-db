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
    const { id } = req.query
    const { imageId } = req.body

    // Remove primary from all images
    await prisma.bearbrickImage.updateMany({
      where: { bearbrickId: id as string },
      data: { isPrimary: false }
    })

    // Set new primary
    await prisma.bearbrickImage.update({
      where: { id: imageId },
      data: { isPrimary: true }
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Set primary error:', error)
    return res.status(500).json({ error: 'Failed to set primary image' })
  } finally {
    await prisma.$disconnect()
  }
}
