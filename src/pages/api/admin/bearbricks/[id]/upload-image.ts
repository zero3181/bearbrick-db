import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { id } = req.query
    const { 
      imageUrl, 
      altText, 
      isPrimary = false,
      replacePrimary = false 
    } = req.body

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' })
    }

    // Check if bearbrick exists
    const bearbrick = await prisma.bearbrick.findUnique({
      where: { id: id as string },
      include: { images: true }
    })

    if (!bearbrick) {
      return res.status(404).json({ error: 'Bearbrick not found' })
    }

    // If replacePrimary is true, remove existing primary image
    if (replacePrimary) {
      await prisma.bearbrickImage.updateMany({
        where: { 
          bearbrickId: id as string,
          isPrimary: true 
        },
        data: { isPrimary: false }
      })
    }

    // If isPrimary is true, make sure no other image is primary
    if (isPrimary && !replacePrimary) {
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
        altText: altText || `${bearbrick.name} image`,
        isPrimary: isPrimary || replacePrimary || bearbrick.images.length === 0,
        bearbrickId: id as string,
        uploadedById: user.id
      }
    })

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      image: newImage
    })

  } catch (error) {
    console.error('Admin image upload error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    await prisma.$disconnect()
  }
}