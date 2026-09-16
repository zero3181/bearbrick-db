'use client'

import { Capacitor } from '@capacitor/core'
import { signIn } from 'next-auth/react'

/** Loads the plugin and configures the Google provider. */
async function initializeGoogle() {
  const { SocialLogin } = await import('@capgo/capacitor-social-login')
  await SocialLogin.initialize({
    google: {
      iOSClientId: process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      iOSServerClientId: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      // Android signs in through Credential Manager, which needs the *web*
      // client here - not the Android one. The Android OAuth client only has
      // to exist in the same Cloud project with this app's package name and
      // signing-key SHA-1; it is never passed in.
      webClientId: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      mode: 'online',
    },
  })
  return SocialLogin
}

/**
 * Ends the Google session the on-device SDK keeps, which next-auth's signOut
 * knows nothing about. Without this, signing out only dropped this site's
 * cookie: the next tap on "Log in" handed the same account straight back with
 * no account picker, so on a shared phone one person could land in the
 * previous person's collection.
 */
export async function signOutFromGoogle() {
  if (!Capacitor.isNativePlatform()) return
  try {
    const SocialLogin = await initializeGoogle()
    await SocialLogin.logout({ provider: 'google' })
  } catch (error) {
    // Already signed out at the SDK level, which is the state we wanted.
    console.warn('Google sign-out skipped:', error)
  }
}

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

  const SocialLogin = await initializeGoogle()

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
