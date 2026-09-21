'use client'

import Link from 'next/link'
import { useState } from 'react'

/**
 * Password sign-in for app reviewers. The app itself only offers Google, and
 * Google's OAuth reliably fails on a review device, so this gives Apple and
 * Google a way in. The API behind it is inert unless the review credentials
 * are set in the environment.
 */
export default function ReviewSignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/review/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        setError(res.status === 404 ? 'Review sign-in is not enabled.' : 'Invalid credentials.')
        return
      }
      // Full reload so every server component picks up the new session.
      window.location.href = '/'
    } catch {
      setError('Sign-in failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white px-4 pt-[env(safe-area-inset-top)]">
      {/* The app's WebView has no address bar or back button of its own, so
          without this the page is a dead end for anyone who opens it by
          mistake. */}
      <header className="py-4">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
          &larr; Back
        </Link>
      </header>

      <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto pt-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">App Review sign-in</h1>
        <p className="text-sm text-gray-500 mb-6">
          For Apple and Google reviewers. Everyone else should sign in with Google.
        </p>

        <label className="block text-sm text-gray-600 mb-1" htmlFor="review-email">
          Email
        </label>
        <input
          id="review-email"
          type="email"
          autoCapitalize="none"
          autoCorrect="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg bg-gray-50 px-3 py-2.5 mb-4 text-gray-900"
          required
        />

        <label className="block text-sm text-gray-600 mb-1" htmlFor="review-password">
          Password
        </label>
        <input
          id="review-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg bg-gray-50 px-3 py-2.5 mb-6 text-gray-900"
          required
        />

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
