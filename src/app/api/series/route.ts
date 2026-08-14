import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('[API] Fetching series...')
    const series = await prisma.series.findMany({
      include: {
        _count: {
          select: { bearbricks: true }
        }
      },
      orderBy: { number: 'desc' }
    })

    console.log(`[API] Found ${series.length} series`)
    return NextResponse.json(series)
  } catch (error) {
    console.error('Error fetching series:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : '')
    return NextResponse.json({ error: 'Failed to fetch series', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
