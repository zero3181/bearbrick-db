import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Simple password check
  const password = req.headers.authorization?.replace('Bearer ', '')
  if (password !== '4321') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { id } = req.query
    const { imageUrl, isPrimary = false } = req.body

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' })
    }

    // If isPrimary is true, make sure no other image is primary
    if (isPrimary) {
      await prisma.bearbrickImage.updateMany({
        where: {
          bearbrickId: id as string,
          isPrimary: true
        },
        data: { isPrimary: false }
      })
    }

    // Create new image
    const newImage = await prisma.bearbrickImage.create({
      data: {
        url: imageUrl,
        isPrimary,
        bearbrick: {
          connect: {
            id: id as string,
          },
        },
      }
    })

    return res.status(200).json({
      success: true,
      image: newImage
    })
  } catch (error) {
    console.error('Image upload error:', error)
    return res.status(500).json({ error: 'Failed to upload image' })
  } finally {
    await prisma.$disconnect()
  }
}
