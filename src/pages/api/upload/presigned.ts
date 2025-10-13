import { NextApiRequest, NextApiResponse } from 'next'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body as HandleUploadBody

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Check for admin authorization in client payload
        const payload = clientPayload ? JSON.parse(clientPayload) : {}
        if (payload.authorization !== '4321') {
          throw new Error('Unauthorized')
        }

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
        } catch (error) {
          console.error('Error in onUploadCompleted:', error)
        }
      },
    })

    return res.status(200).json(jsonResponse)
  } catch (error) {
    console.error('Presigned upload error:', error)
    return res.status(401).json({ error: error instanceof Error ? error.message : 'Unauthorized' })
  }
}