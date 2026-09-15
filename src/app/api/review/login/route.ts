import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { createMobileSession } from '@/lib/mobileAuth'
import { prisma } from '@/lib/prisma'

// A password sign-in exists only for Apple's and Google's app reviewers: the
// app offers Google sign-in alone, and OAuth routinely fails from a review
// device (unfamiliar hardware and location trip Google's extra verification,
// which the reviewer has no way to clear). Without this they would report the
// app as impossible to sign into.
//
// It is inert unless both env vars are set, so it can be switched off the
// moment review is over by removing them - no deploy needed beyond the env
// change. next-auth's own Credentials provider is not an option here: it
// only works with JWT sessions, and this app stores sessions in the database.

function matches(given: string, expected: string) {
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  // timingSafeEqual throws on length mismatch, so compare lengths first -
  // that much is already public from the response timing either way.
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  const expectedEmail = process.env.REVIEW_ACCOUNT_EMAIL
  const expectedPassword = process.env.REVIEW_ACCOUNT_PASSWORD
  if (!expectedEmail || !expectedPassword) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let email: unknown
  let password: unknown
  try {
    ;({ email, password } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const ok =
    typeof email === 'string' &&
    typeof password === 'string' &&
    matches(email.trim().toLowerCase(), expectedEmail.trim().toLowerCase()) &&
    matches(password, expectedPassword)

  if (!ok) {
    // Slow down anyone working through guesses; the real protection is that
    // the password is a long random string set in the environment.
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Deliberately a plain USER unless asked otherwise: an admin account can
  // delete bearbricks, and this one's credentials sit in a review form.
  const role = process.env.REVIEW_ACCOUNT_ROLE === 'ADMIN' ? UserRole.ADMIN : UserRole.USER

  const user = await prisma.user.upsert({
    where: { email: expectedEmail },
    create: { email: expectedEmail, name: 'App Review', role },
    update: { role },
  })

  const { sessionToken, expires } = await createMobileSession(user.id)

  const response = NextResponse.json({ ok: true })
  const useSecureCookies = (process.env.NEXTAUTH_URL || '').startsWith('https://')
  response.cookies.set({
    name: `${useSecureCookies ? '__Secure-' : ''}next-auth.session-token`,
    value: sessionToken,
    expires,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: useSecureCookies,
  })
  return response
}
