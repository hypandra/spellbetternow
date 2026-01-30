'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
      })

      if (result.error) {
        const errorMsg = result.error.message || 'Failed to create account'
        // Provide friendlier error messages for common issues
        if (errorMsg.includes('schema') || errorMsg.includes('database')) {
          setError('Database is temporarily unavailable. Please try again in a few minutes.')
        } else if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
          setError('An account with this email already exists. Try signing in instead.')
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
            Create Account
          </h1>
          <p className="text-spelling-text-muted">Start practicing spelling</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-spelling-text mb-1">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Parent or Guardian"
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-spelling-border-input rounded bg-spelling-surface text-spelling-text disabled:opacity-50"
            />
          </div>

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

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-spelling-text mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-spelling-text-muted">
            Already have an account?{' '}
            <Link href="/login" className="text-spelling-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
