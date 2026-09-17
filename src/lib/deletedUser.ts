import { prisma } from './prisma'

const DELETED_USER_EMAIL = 'deleted-user@bearbrick-db.internal'

// Bearbrick entries, images, and edit/image suggestions are shared database
// content, not the deleting user's personal data - deleting their account
// must not take that content down too. Ownership of anything they created
// transfers to this single placeholder account instead, the same way a wiki
// keeps a page after its author leaves. Nobody can sign into it: it has no
// Google-linked Account row.
export async function getOrCreateDeletedUserId(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email: DELETED_USER_EMAIL },
    create: { email: DELETED_USER_EMAIL, name: 'Deleted User' },
    update: {},
  })
  return user.id
}
