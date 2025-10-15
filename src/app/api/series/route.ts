import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const series = await prisma.series.findMany({
      include: {
        _count: {
          select: { bearbricks: true }
        }
      },
      orderBy: { number: 'desc' }
    })

    return NextResponse.json(series)
  } catch (error) {
    console.error('Error fetching series:', error)
    return NextResponse.json({ error: 'Failed to fetch series' }, { status: 500 })
  }
}
