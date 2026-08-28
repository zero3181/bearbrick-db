import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/serverAuth'

interface NewData {
  name?: string
  seriesId?: string | null
  categoryId?: string | null
  description?: string | null
  isSecret?: boolean
  imageUrl?: string | null
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const action = body.action as string

  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const editRequest = await prisma.edit_requests.findUnique({ where: { id: params.id } })
  if (!editRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }
  if (editRequest.status !== 'PENDING') {
    return NextResponse.json({ error: 'Request already reviewed' }, { status: 400 })
  }

  if (action === 'reject') {
    await prisma.edit_requests.update({
      where: { id: params.id },
      data: { status: 'REJECTED', reviewedById: session.user.id, reviewedAt: new Date() },
    })
    return NextResponse.json({ success: true })
  }

  // approve
  const newData = editRequest.newData as NewData

  const bearbrickUpdate: Record<string, unknown> = {}
  if (newData.name) bearbrickUpdate.name = newData.name
  if (newData.seriesId) bearbrickUpdate.seriesId = newData.seriesId
  bearbrickUpdate.categoryId = newData.categoryId || null
  bearbrickUpdate.description = newData.description || null
  bearbrickUpdate.isSecret = Boolean(newData.isSecret)

  try {
    await prisma.$transaction(async (tx) => {
      await tx.bearbrick.update({
        where: { id: editRequest.bearbrickId },
        data: bearbrickUpdate,
      })

      if (newData.imageUrl) {
        await tx.bearbrickImage.updateMany({
          where: { bearbrickId: editRequest.bearbrickId },
          data: { isPrimary: false },
        })
        await tx.bearbrickImage.create({
          data: {
            url: newData.imageUrl,
            isPrimary: true,
            bearbrickId: editRequest.bearbrickId,
            uploadedById: editRequest.requestedById,
          },
        })
      }

      await tx.edit_requests.update({
        where: { id: params.id },
        data: { status: 'APPROVED', reviewedById: session.user.id, reviewedAt: new Date() },
      })
    })
  } catch (error) {
    console.error('Failed to approve edit request:', error)
    return NextResponse.json({ error: 'Failed to apply changes' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
