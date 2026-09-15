import { NextRequest, NextResponse } from 'next/server'
import { applyOwnerPromotion } from '@/lib/auth'
import { createMobileSession, verifyGoogleIdToken } from '@/lib/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json()
    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'idToken is required' }, { status: 400 })
    }

    const profile = await verifyGoogleIdToken(idToken)

    // Upsert User + Account the same way the Prisma adapter does for the web
    // flow, so a collector's account is identical whether they signed in
    // through the app or the website.
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      create: {
        email: profile.email,
        name: profile.name,
        image: profile.picture,
      },
      update: {
        name: profile.name ?? undefined,
        image: profile.picture ?? undefined,
      },
    })

    await prisma.account.upsert({
      where: { provider_providerAccountId: { provider: 'google', providerAccountId: profile.sub } },
      create: {
        userId: user.id,
        type: 'oauth',
        provider: 'google',
        providerAccountId: profile.sub,
      },
      update: {},
    })

    await applyOwnerPromotion(user)
    // Re-fetch in case the promotion above changed the role.
    const finalUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })

    const { sessionToken, expires } = await createMobileSession(finalUser.id)

    const response = NextResponse.json({
      sessionToken,
      expires,
      user: {
        id: finalUser.id,
        email: finalUser.email,
        name: finalUser.name,
        image: finalUser.image,
        role: finalUser.role,
      },
    })

    // Apps that render the site in a WebView (e.g. the iOS app) call this
    // endpoint from inside that same WebView, so setting next-auth's own
    // session cookie here logs the WebView in exactly like the web OAuth
    // flow would. Clients that only use the bearer token (sessionToken
    // above) simply ignore the Set-Cookie header.
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
  } catch (error) {
    console.error('Mobile Google sign-in failed:', error)
    return NextResponse.json({ error: 'Sign-in failed' }, { status: 401 })
  }
}
