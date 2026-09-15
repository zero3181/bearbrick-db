import { NextResponse } from 'next/server'
import { listCategories } from '@/lib/queries'

export async function GET() {
  try {
    const categories = await listCategories()
    return NextResponse.json(categories, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
    })
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return NextResponse.json([])
  }
}
