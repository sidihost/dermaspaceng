'use client'

import type React from 'react'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useNotify } from '@/components/shared/notify'
import { AuthPanel } from '@/components/saas/auth-panel'

export default function SaasSignupPage() {
  const router = useRouter()
  const notify = useNotify()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    password: '',
  })

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null)
      setForm((f) => ({ ...f, [key]: e.target.value }))
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/saas/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.companyName,
          contactName: form.contactName,
          contactEmail: form.email,
          password: form.password,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Could not create your account.')
        return
      }
      notify.success('Account created. Welcome aboard.')
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
        headline="Your brand. Your voice. Our technology."
        sub="Create your workspace, teach the assistant your business, and go live with one line of code. No AI keys, no per-message bills."
      />

      <div className="flex items-center justify-center px-4 py-12 lg:px-12">
        <div className="w-full max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            Get started
          </p>
          <h1 className="mt-4 text-pretty font-serif text-3xl text-foreground md:text-4xl">
            Create your workspace
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Set everything up free. Your assistant goes live once your subscription is activated.
          </p>

          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="companyName" className="text-sm font-medium text-foreground">
                Company name
              </label>
              <input
                id="companyName"
                required
                autoComplete="organization"
                value={form.companyName}
                onChange={update('companyName')}
                className={fieldClass}
                placeholder="Amara Beauty Studio"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="contactName" className="text-sm font-medium text-foreground">
                Your name
              </label>
              <input
                id="contactName"
                required
                autoComplete="name"
                value={form.contactName}
                onChange={update('contactName')}
                className={fieldClass}
                placeholder="Jane Doe"
              />
            </div>

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
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={update('password')}
                className={fieldClass}
                placeholder="At least 8 characters"
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
              {loading ? 'Creating account\u2026' : 'Create account'}
              {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </button>
          </form>

          <p className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/derma-ai-saas/login"
              className="font-semibold text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
