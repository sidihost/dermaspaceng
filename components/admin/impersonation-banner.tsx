'use client'

/**
 * Global "you're impersonating <user>" banner.
 *
 * Mounted once via ClientShell and self-gates on the impersonation
 * status endpoint. When a non-impersonation session is active it
 * renders null and adds no DOM cost. When an admin is signed in as
 * a customer it pins a slim, brand-coloured strip to the top of the
 * viewport with a "Stop" button that restores the original admin
 * session.
 *
 * The banner deliberately uses a hot rose accent (not brand purple)
 * because mistaking an impersonation session for a regular admin
 * session is the failure mode we're trying to prevent — the hot
 * stripe makes it visually unambiguous.
 */

import { useEffect, useState } from 'react'
import { Eye, X, Loader2 } from 'lucide-react'

interface ImpersonationStatus {
  impersonating: boolean
  target?: { id: string; name: string; email: string }
  admin?: { id: string; name: string }
}

export default function ImpersonationBanner() {
  const [status, setStatus] = useState<ImpersonationStatus | null>(null)
  const [stopping, setStopping] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/admin/impersonate/status', {
          cache: 'no-store',
        })
        if (!res.ok) return
        const body = (await res.json()) as ImpersonationStatus
        if (!cancelled) setStatus(body)
      } catch {
        // Silent — banner just stays hidden.
      }
    }
    load()
    // Poll once a minute so the banner disappears quickly after the
    // admin clicks "Stop" from another tab.
    const interval = setInterval(load, 60_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const handleStop = async () => {
    setStopping(true)
    try {
      const res = await fetch('/api/admin/impersonate/stop', {
        method: 'POST',
      })
      const body = await res.json().catch(() => ({}))
      if (body?.adminSessionExpired) {
        window.location.href = '/signin'
        return
      }
      // Hard reload back to the admin dashboard so the restored admin
      // session is unambiguous. We deliberately do NOT return to
      // /admin/users/<targetId> — landing on the client's own detail
      // record made it look like the admin was still "inside" the
      // customer's view. The main dashboard is a clean admin surface.
      window.location.href = '/admin'
    } catch {
      setStopping(false)
    }
  }

  if (!status?.impersonating) return null

  const targetLabel =
    status.target?.name?.trim() || status.target?.email || 'this user'

  return (
    <div className="fixed top-0 inset-x-0 z-[60] bg-rose-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 h-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="w-4 h-4 flex-shrink-0" />
          <p className="text-[12.5px] sm:text-sm font-medium truncate">
            <span className="hidden sm:inline">Signed in as </span>
            <span className="font-semibold">{targetLabel}</span>
            <span className="hidden md:inline text-rose-100">
              {' '}
              · admin investigation mode
            </span>
          </p>
        </div>
        <button
          onClick={handleStop}
          disabled={stopping}
          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-white text-rose-700 text-[11.5px] font-semibold hover:bg-rose-50 transition-colors disabled:opacity-60 flex-shrink-0"
        >
          {stopping ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <X className="w-3.5 h-3.5" />
          )}
          Stop
        </button>
      </div>
    </div>
  )
}
