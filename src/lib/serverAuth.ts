import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

export async function requireUser() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  return session
}

export async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
    return null
  }
  return session
}

export async function requireOwner() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'OWNER') {
    return null
  }
  return session
}
