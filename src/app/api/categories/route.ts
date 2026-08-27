import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const categories = await prisma.categories.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(categories, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
    })
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return NextResponse.json([])
  }
}
