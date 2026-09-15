'use client'

import { Capacitor } from '@capacitor/core'
import { signIn } from 'next-auth/react'

// Google refuses to complete OAuth inside an embedded WebView (the one the
// iOS/Android app uses to show this site), so the normal next-auth redirect
// flow bounces the user out to Safari and never returns. Native platforms
// sign in with Google's on-device SDK instead, then hand the resulting ID
// token to /api/mobile/auth/google, which sets the same session cookie
// next-auth would have set - the rest of the app never needs to know which
// path was used.
export async function signInWithGoogle() {
  if (!Capacitor.isNativePlatform()) {
    return signIn('google')
  }

  const { SocialLogin } = await import('@capgo/capacitor-social-login')

  await SocialLogin.initialize({
    google: {
      iOSClientId: process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      iOSServerClientId: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      mode: 'online',
    },
  })

  const result = await SocialLogin.login({
    provider: 'google',
    options: { scopes: ['email', 'profile'] },
  })

  const googleResult = result.result
  const idToken = googleResult && 'idToken' in googleResult ? googleResult.idToken : null
  if (!idToken) {
    throw new Error('Google sign-in did not return an ID token')
  }

  const response = await fetch('/api/mobile/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ idToken }),
  })

  if (!response.ok) {
    throw new Error('Mobile sign-in failed')
  }

  window.location.reload()
}
