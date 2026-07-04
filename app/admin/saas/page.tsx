'use client'

/**
 * /admin/saas
 *
 * Platform console for the Derma AI SaaS. Lists every licensed company
 * and lets an admin activate, suspend or renew the ₦35,000/year
 * subscription. Activation stamps a one-year expiry and flips the widget
 * live on the tenant's website.
 */

import useSWR from 'swr'
import { useState } from 'react'
import {
  Building2,
  Loader2,
  Check,
  Copy,
  Trash2,
  BookOpen,
  MessageSquare,
  Power,
  RotateCw,
} from 'lucide-react'

type Tenant = {
  id: string
  company_name: string
  contact_name: string
  contact_email: string
  public_key: string
  status: 'pending' | 'active' | 'suspended'
  plan_price_kobo: number
  subscription_expires_at: string | null
  created_at: string
  activated_at: string | null
  knowledge_count: number
  conversation_count: number
}

const fetcher = (u: string) => fetch(u).then((r) => r.json())

export default function AdminSaasPage() {
  const { data, isLoading, mutate } = useSWR<{ tenants: Tenant[] }>(
    '/api/admin/saas/tenants',
    fetcher,
  )
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const tenants = data?.tenants ?? []
  const activeCount = tenants.filter((t) => t.status === 'active').length
  const pendingCount = tenants.filter((t) => t.status === 'pending').length

  const act = async (id: string, action: 'activate' | 'suspend' | 'renew') => {
    setBusy(id)
    try {
      await fetch(`/api/admin/saas/tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      await mutate()
    } finally {
      setBusy(null)
    }
  }

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This permanently removes their account, training data and conversations.`)) return
    setBusy(id)
    try {
      await fetch(`/api/admin/saas/tenants/${id}`, { method: 'DELETE' })
      await mutate()
    } finally {
      setBusy(null)
    }
  }

  const copy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    } catch {}
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#7B2D8E]/10">
            <Building2 className="h-4 w-4 text-[#7B2D8E]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold leading-none tracking-tight text-gray-900 sm:text-lg">
              Derma AI SaaS
            </h1>
            <p className="mt-1 truncate text-xs text-gray-500">
              {tenants.length} companies &middot; {activeCount} active &middot; {pendingCount} pending
            </p>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#7B2D8E]" />
        </div>
      ) : tenants.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <Building2 className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No companies have signed up yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tenants.map((t) => (
            <div key={t.id} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-gray-900">
                      {t.company_name}
                    </h2>
                    <StatusPill status={t.status} expiresAt={t.subscription_expires_at} />
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {t.contact_name} &middot; {t.contact_email}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="rounded-md bg-gray-50 px-2 py-1 font-mono text-xs text-gray-700">
                      {t.public_key}
                    </code>
                    <button
                      onClick={() => copy(t.public_key)}
                      className="text-gray-400 hover:text-[#7B2D8E]"
                      aria-label="Copy public key"
                    >
                      {copied === t.public_key ? (
                        <Check className="h-3.5 w-3.5 text-[#7B2D8E]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" />
                      {t.knowledge_count} training entries
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {t.conversation_count} conversations
                    </span>
                    <span>Joined {new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                  {t.status !== 'active' && (
                    <button
                      onClick={() => act(t.id, 'activate')}
                      disabled={busy === t.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#7B2D8E] px-3.5 py-2 text-sm font-medium text-white hover:bg-[#5A1D6A] disabled:opacity-60"
                    >
                      <Power className="h-4 w-4" />
                      Activate
                    </button>
                  )}
                  {t.status === 'active' && (
                    <>
                      <button
                        onClick={() => act(t.id, 'renew')}
                        disabled={busy === t.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E] disabled:opacity-60"
                      >
                        <RotateCw className="h-4 w-4" />
                        Renew 1yr
                      </button>
                      <button
                        onClick={() => act(t.id, 'suspend')}
                        disabled={busy === t.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:border-rose-300 hover:text-rose-600 disabled:opacity-60"
                      >
                        Suspend
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => remove(t.id, t.company_name)}
                    disabled={busy === t.id}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                    aria-label={`Delete ${t.company_name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusPill({
  status,
  expiresAt,
}: {
  status: Tenant['status']
  expiresAt: string | null
}) {
  const expired =
    status === 'active' && expiresAt ? new Date(expiresAt).getTime() < Date.now() : false

  if (expired) {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        Expired
      </span>
    )
  }

  const map: Record<Tenant['status'], { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'bg-[#7B2D8E]/10 text-[#7B2D8E]' },
    pending: { label: 'Pending', cls: 'bg-gray-100 text-gray-600' },
    suspended: { label: 'Suspended', cls: 'bg-rose-100 text-rose-700' },
  }
  const s = map[status]
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
  )
}
