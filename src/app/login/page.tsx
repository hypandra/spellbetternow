'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      })

      if (result.error) {
        const errorMsg = result.error.message || 'Failed to sign in'
        // Provide friendlier error messages
        if (errorMsg.includes('schema') || errorMsg.includes('database')) {
          setError('Database is temporarily unavailable. Please try again in a few minutes.')
        } else if (errorMsg.includes('Invalid') || errorMsg.includes('incorrect') || errorMsg.includes('not found')) {
          setError('Invalid email or password. Please try again.')
        } else {
          setError(errorMsg)
        }
        setLoading(false)
        return
      }

      router.push('/app')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      // Handle network/connection errors
      if (message.includes('fetch') || message.includes('network') || message.includes('Failed to fetch')) {
        setError('Unable to connect. Please check your internet connection and try again.')
      } else if (message.includes('schema') || message.includes('database')) {
        setError('Database is temporarily unavailable. Please try again in a few minutes.')
      } else {
        setError(message)
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 bg-spelling-surface border border-spelling-border rounded-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-medium text-spelling-text mb-2">
            Sign In
          </h1>
          <p className="text-spelling-text-muted">Welcome back</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-spelling-text mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-spelling-border-input rounded bg-spelling-surface text-spelling-text disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-spelling-text mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-spelling-border-input rounded bg-spelling-surface text-spelling-text disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="bg-spelling-error-bg border border-spelling-error-text/30 text-spelling-error-text p-3 rounded text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-spelling-primary text-spelling-surface rounded hover:bg-spelling-primary-hover disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-spelling-text-muted">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-spelling-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
