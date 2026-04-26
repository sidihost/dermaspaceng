'use client'

// ---------------------------------------------------------------------------
// components/blog/permissions-manager.tsx
//
// Admin-only UI for granting / revoking the four blog capabilities for
// each staff member. Renders a clean per-staff card with four toggles
// (Create, Edit, Publish, Delete) and persists changes via the
// /api/blog/permissions endpoint.
//
// Notes
// -----
// * Each staff row maintains its own optimistic state — toggling a flag
//   updates the row immediately, then fires the network request. If the
//   server rejects, we revert and surface the error.
// * No bulk submit / save button — this is a permissions surface, not a
//   form, so changes should feel instantaneous like Slack admin or Linear.
// ---------------------------------------------------------------------------

import { useState } from 'react'
import {
  Users,
  Search,
  Pencil,
  Send,
  Trash2,
  Plus,
  Loader2,
  CheckCircle2,
} from 'lucide-react'

interface StaffRow {
  id: string
  first_name: string
  last_name: string
  email: string
  can_create: boolean
  can_edit: boolean
  can_publish: boolean
  can_delete: boolean
}

type FlagKey = 'can_create' | 'can_edit' | 'can_publish' | 'can_delete'

const FLAGS: Array<{
  key: FlagKey
  label: string
  hint: string
  icon: typeof Plus
}> = [
  { key: 'can_create', label: 'Create',  hint: 'Write new posts',           icon: Plus },
  { key: 'can_edit',   label: 'Edit',    hint: 'Edit existing posts',       icon: Pencil },
  { key: 'can_publish',label: 'Publish', hint: 'Move posts to live status', icon: Send },
  { key: 'can_delete', label: 'Delete',  hint: 'Remove posts permanently',  icon: Trash2 },
]

export function PermissionsManager({ initialStaff }: { initialStaff: StaffRow[] }) {
  const [staff, setStaff] = useState<StaffRow[]>(initialStaff)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const filtered = staff.filter((s) => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    )
  })

  async function toggle(row: StaffRow, key: FlagKey) {
    // Optimistic — flip locally first, roll back on failure.
    const prev = staff
    const updated: StaffRow = { ...row, [key]: !row[key] }
    setStaff((s) => s.map((r) => (r.id === row.id ? updated : r)))
    setSavingId(row.id)
    setError(null)

    try {
      const res = await fetch('/api/blog/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: row.id,
          can_create: updated.can_create,
          can_edit: updated.can_edit,
          can_publish: updated.can_publish,
          can_delete: updated.can_delete,
        }),
      })
      if (!res.ok) throw new Error('save failed')
      setSavedId(row.id)
      setTimeout(() => setSavedId((id) => (id === row.id ? null : id)), 1200)
    } catch {
      setStaff(prev)
      setError('Could not save the change. Please try again.')
    } finally {
      setSavingId((id) => (id === row.id ? null : id))
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900">
              Blog permissions
            </h1>
            <p className="text-xs text-gray-500 truncate">
              Grant staff the ability to write, edit, publish, or delete posts.
            </p>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search staff..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/10"
          />
        </div>
      </header>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
          <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            {query ? 'No matching staff' : 'No staff yet'}
          </h2>
          <p className="text-sm text-gray-500">
            {query
              ? 'Try a different name or email.'
              : 'Invite staff from the Staff page first, then come back here to grant blog access.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((row) => {
            const fullName = `${row.first_name} ${row.last_name}`.trim() || row.email
            const initials =
              (row.first_name?.[0] ?? '').toUpperCase() +
              (row.last_name?.[0] ?? '').toUpperCase()
            const anyGranted =
              row.can_create || row.can_edit || row.can_publish || row.can_delete
            return (
              <li
                key={row.id}
                className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#F8F2FB] flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-[#7B2D8E]">
                        {initials || '?'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {fullName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{row.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {savingId === row.id && (
                      <Loader2 className="w-4 h-4 text-[#7B2D8E] animate-spin" />
                    )}
                    {savedId === row.id && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Saved
                      </span>
                    )}
                    {!anyGranted && savingId !== row.id && savedId !== row.id && (
                      <span className="text-[11px] font-medium text-gray-400">
                        No access
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FLAGS.map((flag) => {
                    const on = row[flag.key]
                    const Icon = flag.icon
                    return (
                      <button
                        key={flag.key}
                        type="button"
                        onClick={() => toggle(row, flag.key)}
                        disabled={savingId === row.id}
                        className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition ${
                          on
                            ? 'bg-[#7B2D8E] text-white border-[#7B2D8E]'
                            : 'bg-gray-50 text-gray-700 border-gray-100 hover:border-[#7B2D8E]/30'
                        } disabled:opacity-50`}
                        aria-pressed={on}
                      >
                        <Icon className={`w-4 h-4 ${on ? 'text-white' : 'text-[#7B2D8E]'}`} />
                        <span className="text-xs font-semibold">{flag.label}</span>
                        <span
                          className={`text-[10px] leading-tight ${
                            on ? 'text-white/80' : 'text-gray-500'
                          }`}
                        >
                          {flag.hint}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
