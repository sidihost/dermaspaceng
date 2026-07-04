'use client'

import type React from 'react'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useNotify } from '@/components/shared/notify'
import { ButterflyLogo } from '@/components/shared/butterfly-logo'

export default function SaasSignupPage() {
  const router = useRouter()
  const notify = useNotify()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    password: '',
  })

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/saas/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        notify.error(data?.error || 'Could not create your account.')
        return
      }
      notify.success('Account created. Welcome aboard.')
      router.push('/derma-ai-saas/dashboard')
    } catch {
      notify.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fieldClass =
    'h-11 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#7B2D8E]'

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-[#7B2D8E]/[0.03] px-4 py-12">
      <Link href="/derma-ai-saas" className="mb-6 flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7B2D8E] text-white">
          <ButterflyLogo className="h-5 w-5 text-white" />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-bold text-gray-900">Derma AI</span>
          <span className="block text-[11px] text-gray-500">for Business</span>
        </span>
      </Link>

      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 md:p-8">
        <h1 className="text-pretty font-serif text-2xl font-bold text-gray-900">
          Create your workspace
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Start using Derma AI on your own site. No AI keys required — you run on our credits.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="companyName" className="text-sm font-medium text-gray-900">
              Company name
            </label>
            <input
              id="companyName"
              required
              value={form.companyName}
              onChange={update('companyName')}
              className={fieldClass}
              placeholder="Acme Skincare Ltd"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="contactName" className="text-sm font-medium text-gray-900">
              Your name
            </label>
            <input
              id="contactName"
              required
              value={form.contactName}
              onChange={update('contactName')}
              className={fieldClass}
              placeholder="Jane Doe"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-900">
              Work email
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={update('email')}
              className={fieldClass}
              placeholder="jane@acme.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-900">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={update('password')}
              className={fieldClass}
              placeholder="At least 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#7B2D8E] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#6B2278] disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Create account'}
            {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/derma-ai-saas/login" className="font-semibold text-[#7B2D8E] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
