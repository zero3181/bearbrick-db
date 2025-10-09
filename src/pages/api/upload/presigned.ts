import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from "@/lib/auth"
import { UserRole } from '@prisma/client'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

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
    const body = req.body as HandleUploadBody

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // Generate unique filename
        const timestamp = Date.now()
        const ext = pathname.split('.').pop() || 'jpg'
        const filename = `bearbrick-${timestamp}.${ext}`

        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          tokenPayload: JSON.stringify({
            uploadedById: session.user.id,
          }),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          console.log('Blob upload completed:', blob.url)
          // Additional processing can be done here
        } catch (error) {
          console.error('Error in onUploadCompleted:', error)
        }
      },
    })

    return res.status(200).json(jsonResponse)
  } catch (error) {
    console.error('Presigned upload error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}