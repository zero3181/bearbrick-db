import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { prisma } from './prisma'

type BearerSession = {
  user: {
    id: string
    email: string | null
    name: string | null
    image: string | null
    role: string
  }
}

// Web sessions are the HttpOnly NextAuth cookie (getServerSession). The
// mobile app has no cookie jar, so when a request is passed in we also try an
// `Authorization: Bearer <sessionToken>` header, looked up directly against
// the same `Session` table NextAuth itself uses - same rows, same expiry,
// just a second way in.
async function getBearerSession(request: NextRequest): Promise<BearerSession | null> {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: { user: true },
  })
  if (!session || session.expires < new Date()) return null

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      role: session.user.role,
    },
  }
}

async function resolveSession(request?: NextRequest) {
  const cookieSession = await getServerSession(authOptions)
  if (cookieSession) return cookieSession
  if (!request) return null
  return getBearerSession(request)
}

export async function requireUser(request?: NextRequest) {
  const session = await resolveSession(request)
  if (!session) return null
  return session
}

export async function requireAdmin(request?: NextRequest) {
  const session = await resolveSession(request)
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
    return null
  }
  return session
}

export async function requireOwner(request?: NextRequest) {
  const session = await resolveSession(request)
  if (!session || session.user.role !== 'OWNER') {
    return null
  }
  return session
}
