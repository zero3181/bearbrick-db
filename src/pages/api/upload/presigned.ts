import { NextApiRequest, NextApiResponse } from 'next'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

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
    const body = req.body as HandleUploadBody

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          tokenPayload: JSON.stringify({
            uploadedAt: Date.now(),
          }),
        }
      },
      onUploadCompleted: async ({ blob }) => {
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