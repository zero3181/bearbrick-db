import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { PrismaClient, UserRole } from '@prisma/client'
import formidable from 'formidable'
import { promises as fs } from 'fs'
import path from 'path'

const prisma = new PrismaClient()

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Check if user has admin or owner privileges
  if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.OWNER) {
    return res.status(403).json({ error: 'Insufficient permissions' })
  }

  try {
    const form = formidable({
      uploadDir: path.join(process.cwd(), 'public', 'uploads'),
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB
    })

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(uploadDir, { recursive: true })

    const [fields, files] = await form.parse(req)
    
    const file = Array.isArray(files.image) ? files.image[0] : files.image
    const bearbrickId = Array.isArray(fields.bearbrickId) ? fields.bearbrickId[0] : fields.bearbrickId
    const altText = Array.isArray(fields.altText) ? fields.altText[0] : fields.altText
    const isPrimary = Array.isArray(fields.isPrimary) ? fields.isPrimary[0] === 'true' : fields.isPrimary === 'true'

    if (!file || !bearbrickId) {
      return res.status(400).json({ error: 'Missing file or bearbrick ID' })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const ext = path.extname(file.originalFilename || '')
    const filename = `bearbrick-${bearbrickId}-${timestamp}${ext}`
    const newPath = path.join(uploadDir, filename)

    // Move file to permanent location
    await fs.rename(file.filepath, newPath)

    // Save to database
    const imageUrl = `/uploads/${filename}`
    const bearbrickImage = await prisma.bearbrickImage.create({
      data: {
        url: imageUrl,
        altText: altText || null,
        isPrimary: isPrimary || false,
        bearbrickId: bearbrickId,
        uploadedById: session.user.id,
      },
    })

    res.status(200).json({ 
      success: true, 
      image: bearbrickImage,
      message: 'Image uploaded successfully' 
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    await prisma.$disconnect()
  }
}