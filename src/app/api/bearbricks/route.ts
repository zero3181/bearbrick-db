import { NextRequest, NextResponse } from 'next/server'
import { listBearbricks } from '@/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const series = searchParams.get('series')

    const mapped = await listBearbricks(series || undefined)

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Failed to fetch bearbricks:', error)
    // Return empty array instead of error object to prevent client-side crashes
    return NextResponse.json([])
  }
}
