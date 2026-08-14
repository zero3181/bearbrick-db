import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    if (token !== '4321') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    await prisma.$transaction([
      prisma.edit_requests.deleteMany({ where: { bearbrickId: params.id } }),
      prisma.image_requests.deleteMany({ where: { bearbrickId: params.id } }),
      prisma.bearbrick.delete({ where: { id: params.id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bearbrick:', error)
    return NextResponse.json(
      { error: 'Failed to delete bearbrick' },
      { status: 500 }
    )
  }
}
