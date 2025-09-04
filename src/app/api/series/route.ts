import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const series = await prisma.series.findMany({
      orderBy: { number: 'desc' },
      include: {
        _count: {
          select: { bearbricks: true }
        }
      }
    })
    
    return NextResponse.json(series)
    
  } catch (error) {
    console.error('Error fetching series:', error)
    return NextResponse.json(
      { error: 'Failed to fetch series' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}