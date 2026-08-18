import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/serverAuth'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
