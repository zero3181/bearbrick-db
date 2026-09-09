import { randomBytes } from 'crypto'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from './prisma'

// The native sign-in on the phone is configured with `webClientId` set to
// this same GOOGLE_CLIENT_ID (the existing web OAuth client) - Google mints
// the ID token audienced to that web client regardless of which platform
// (iOS/Android) client ran the on-device sign-in flow, so verification here
// checks against the one client ID the web app already uses.
const client = new OAuth2Client()

export type VerifiedGoogleProfile = {
  sub: string
  email: string
  name: string | null
  picture: string | null
}

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleProfile> {
  const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID })
  const payload = ticket.getPayload()
  if (!payload?.email) {
    throw new Error('Google ID token did not include an email')
  }
  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name ?? null,
    picture: payload.picture ?? null,
  }
}

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export async function createMobileSession(userId: string) {
  const sessionToken = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + SESSION_LIFETIME_MS)
  await prisma.session.create({ data: { sessionToken, userId, expires } })
  return { sessionToken, expires }
}
