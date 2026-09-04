import { NextRequest, NextResponse, after } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/serverAuth'
import { normalizeImageInBackground } from '@/lib/normalizeImage'

interface NewData {
  name?: string
  seriesId?: string | null
  categoryId?: string | null
  description?: string | null
  isSecret?: boolean
  rarityPercentage?: number | null
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

  if (editRequest.type === 'NEW_ITEM') {
    if (!newData.name || !newData.seriesId) {
      return NextResponse.json({ error: 'Suggestion is missing a name or series' }, { status: 400 })
    }

    let createdImage: { id: string; bearbrickId: string } | null = null

    try {
      await prisma.$transaction(async (tx) => {
        const created = await tx.bearbrick.create({
          data: {
            name: newData.name!,
            seriesId: newData.seriesId!,
            categoryId: newData.categoryId || null,
            description: newData.description || null,
            isSecret: Boolean(newData.isSecret),
            rarityPercentage: newData.rarityPercentage ?? null,
            createdById: editRequest.requestedById,
            sizePercentage: 100,
          },
        })

        if (newData.imageUrl) {
          const image = await tx.bearbrickImage.create({
            data: {
              url: newData.imageUrl,
              isPrimary: true,
              bearbrickId: created.id,
              uploadedById: editRequest.requestedById,
            },
          })
          createdImage = { id: image.id, bearbrickId: created.id }
        }

        // Point this request at the bearbrick it created so the existing
        // "who submitted this" credit lookup (latest approved edit_request
        // per bearbrickId) picks it up with no extra plumbing.
        await tx.edit_requests.update({
          where: { id: params.id },
          data: { status: 'APPROVED', reviewedById: session.user.id, reviewedAt: new Date(), bearbrickId: created.id },
        })
      })
    } catch (error) {
      console.error('Failed to approve new-item request:', error)
      return NextResponse.json({ error: 'Failed to create bearbrick' }, { status: 500 })
    }

    if (createdImage) {
      const img: { id: string; bearbrickId: string } = createdImage
      after(() => normalizeImageInBackground(img.id, newData.imageUrl!, img.bearbrickId))
    }

    return NextResponse.json({ success: true })
  }

  const bearbrickUpdate: Record<string, unknown> = {}
  if (newData.name) bearbrickUpdate.name = newData.name
  if (newData.seriesId) bearbrickUpdate.seriesId = newData.seriesId
  bearbrickUpdate.categoryId = newData.categoryId || null
  bearbrickUpdate.description = newData.description || null
  bearbrickUpdate.isSecret = Boolean(newData.isSecret)
  if ('rarityPercentage' in newData) bearbrickUpdate.rarityPercentage = newData.rarityPercentage ?? null

  let updatedImageId: string | null = null

  try {
    await prisma.$transaction(async (tx) => {
      await tx.bearbrick.update({
        where: { id: editRequest.bearbrickId! },
        data: bearbrickUpdate,
      })

      if (newData.imageUrl) {
        await tx.bearbrickImage.updateMany({
          where: { bearbrickId: editRequest.bearbrickId! },
          data: { isPrimary: false },
        })
        const image = await tx.bearbrickImage.create({
          data: {
            url: newData.imageUrl,
            isPrimary: true,
            bearbrickId: editRequest.bearbrickId!,
            uploadedById: editRequest.requestedById,
          },
        })
        updatedImageId = image.id
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

  if (updatedImageId) {
    const imageId: string = updatedImageId
    after(() => normalizeImageInBackground(imageId, newData.imageUrl!, editRequest.bearbrickId!))
  }

  return NextResponse.json({ success: true })
}
