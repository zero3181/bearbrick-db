import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/serverAuth'
import { getOrCreateDeletedUserId } from '@/lib/deletedUser'

export async function GET(request: NextRequest) {
  const session = await requireUser(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { nickname: true, showCredit: true },
  })

  // The mobile app has no session cookie to read the signed-in user from, so
  // this doubles as its "who am I" call - the role is what gates its admin UI.
  return NextResponse.json({
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
    role: session.user.role,
    ...user,
  })
}

export async function PATCH(request: NextRequest) {
  const session = await requireUser(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const nickname = typeof body.nickname === 'string' ? body.nickname.trim().slice(0, 30) || null : null
  const showCredit = Boolean(body.showCredit) && nickname !== null

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { nickname, showCredit },
    select: { nickname: true, showCredit: true },
  })

  return NextResponse.json(user)
}

export async function DELETE(request: NextRequest) {
  const session = await requireUser(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Hidden in the UI for these roles, and refused here too: the button is
  // not the only way to reach this endpoint.
  if (session.user.role === 'ADMIN' || session.user.role === 'OWNER') {
    return NextResponse.json({ error: 'Admin accounts cannot be deleted here' }, { status: 403 })
  }

  const userId = session.user.id
  const deletedUserId = await getOrCreateDeletedUserId()

  // Reassign the content this user contributed to the shared database
  // before deleting them - Account, Session, and CollectionItem cascade
  // automatically via the schema, but Bearbrick/BearbrickImage/edit_requests/
  // image_requests/user_submitted_images don't, and are meant to survive.
  await prisma.$transaction([
    prisma.bearbrick.updateMany({ where: { createdById: userId }, data: { createdById: deletedUserId } }),
    prisma.bearbrickImage.updateMany({ where: { uploadedById: userId }, data: { uploadedById: deletedUserId } }),
    prisma.edit_requests.updateMany({ where: { requestedById: userId }, data: { requestedById: deletedUserId } }),
    prisma.edit_requests.updateMany({ where: { reviewedById: userId }, data: { reviewedById: deletedUserId } }),
    prisma.image_requests.updateMany({ where: { requestedById: userId }, data: { requestedById: deletedUserId } }),
    prisma.image_requests.updateMany({ where: { reviewedById: userId }, data: { reviewedById: deletedUserId } }),
    prisma.user_submitted_images.updateMany({ where: { submittedById: userId }, data: { submittedById: deletedUserId } }),
    prisma.user_submitted_images.updateMany({ where: { reviewedById: userId }, data: { reviewedById: deletedUserId } }),
    prisma.user.delete({ where: { id: userId } }),
  ])

  return new NextResponse(null, { status: 204 })
}
