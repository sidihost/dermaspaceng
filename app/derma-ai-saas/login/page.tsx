'use client'

import type React from 'react'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { AuthPanel } from '@/components/saas/auth-panel'

export default function SaasLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ email: '', password: '' })

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null)
      setForm((f) => ({ ...f, [key]: e.target.value }))
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/saas/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Invalid email or password.')
        return
      }
      router.push('/derma-ai-saas/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fieldClass =
    'h-12 rounded-lg border border-border bg-background px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary'

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[0.9fr_1.1fr]">
      <AuthPanel
        headline="Welcome back to your assistant."
        sub="Manage your branding, grow your knowledge base, and read every conversation your assistant has had."
      />

      <div className="flex items-center justify-center px-4 py-12 lg:px-12">
        <div className="w-full max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Sign in</p>
          <h1 className="mt-4 text-pretty font-serif text-3xl text-foreground md:text-4xl">
            Welcome back
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Sign in to manage your assistant, branding and knowledge base.
          </p>

          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Work email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={update('email')}
                className={fieldClass}
                placeholder="jane@yourcompany.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={update('password')}
                className={fieldClass}
                placeholder="Your password"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/40 px-4 py-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Signing in\u2026' : 'Sign in'}
              {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </button>
          </form>

          <p className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
            New here?{' '}
            <Link
              href="/derma-ai-saas/signup"
              className="font-semibold text-primary hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
