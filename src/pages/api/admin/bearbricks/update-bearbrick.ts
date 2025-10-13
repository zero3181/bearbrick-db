import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Simple password check
  const password = req.headers.authorization?.replace('Bearer ', '')
  if (password !== '4321') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { id, name, series, size, releaseDate, description } = req.body

    if (!id || !name) {
      return res.status(400).json({ error: 'ID and name are required' })
    }

    // Handle series if provided
    let seriesId = null
    if (series) {
      const existingSeries = await prisma.series.findFirst({
        where: { name: series },
      })
      if (existingSeries) {
        seriesId = existingSeries.id
      } else {
        const newSeries = await prisma.series.create({
          data: { name: series },
        })
        seriesId = newSeries.id
      }
    }

    const updatedBearbrick = await prisma.bearbrick.update({
      where: { id },
      data: {
        name,
        sizePercentage: size,
        releaseDate: releaseDate ? new Date(releaseDate) : null,
        description: description || null,
        ...(seriesId && { seriesId }),
      },
      include: {
        images: true,
        series: true,
      },
    })

    return res.status(200).json(updatedBearbrick)
  } catch (error) {
    console.error('Update bearbrick error:', error)
    return res.status(500).json({ error: 'Failed to update bearbrick' })
  }
}
