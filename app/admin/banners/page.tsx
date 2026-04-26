'use client'

/**
 * /admin/banners
 *
 * Manage the editable announcement / promo bars shown across the
 * site. Admins can create, edit, schedule, and delete banners. Each
 * banner has a target scope (site / dashboard / admin / all), a
 * variant for color, an optional CTA link, and optional schedule.
 */

import useSWR from 'swr'
import { useState } from 'react'
import {
  Megaphone,
  Plus,
  Loader2,
  Trash2,
  Edit3,
  X,
  Check,
  Info,
  AlertTriangle,
  ShieldAlert,
  Calendar,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'

// Note: Sparkle / Sparkles icons are intentionally avoided across the
// admin and dashboard surfaces per design direction.

type Banner = {
  id: string
  message: string
  link_url: string | null
  link_text: string | null
  variant: 'info' | 'success' | 'warning' | 'danger' | 'promo'
  scope: 'site' | 'dashboard' | 'admin' | 'all'
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  dismissible: boolean
  created_at: string
}

const fetcher = (u: string) => fetch(u).then((r) => r.json())

const variantTheme: Record<Banner['variant'], { bg: string; text: string; border: string; label: string }> = {
  info:    { bg: 'bg-[#7B2D8E]/5',  text: 'text-[#7B2D8E]', border: 'border-[#7B2D8E]/20', label: 'Info' },
  promo:   { bg: 'bg-[#7B2D8E]',    text: 'text-white',     border: 'border-[#7B2D8E]',    label: 'Promo' },
  success: { bg: 'bg-emerald-50',   text: 'text-emerald-700', border: 'border-emerald-100', label: 'Success' },
  warning: { bg: 'bg-amber-50',     text: 'text-amber-800', border: 'border-amber-100',   label: 'Warning' },
  danger:  { bg: 'bg-rose-50',      text: 'text-rose-700',  border: 'border-rose-100',    label: 'Danger' },
}

export default function BannersPage() {
  const { data, isLoading, mutate } = useSWR<{ banners: Banner[] }>(
    '/api/admin/banners',
    fetcher,
  )
  const [editing, setEditing] = useState<Banner | null>(null)
  const [creating, setCreating] = useState(false)

  const banners = data?.banners ?? []
  const active = banners.filter((b) => b.is_active).length

  const remove = async (id: string) => {
    if (!confirm('Delete this banner? This cannot be undone.')) return
    await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' })
    mutate()
  }

  const toggleActive = async (b: Banner) => {
    mutate(
      (prev) => prev && {
        banners: prev.banners.map((x) => (x.id === b.id ? { ...x, is_active: !b.is_active } : x)),
      },
      { revalidate: false },
    )
    await fetch(`/api/admin/banners/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !b.is_active }),
    })
    mutate()
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-4 h-4 text-[#7B2D8E]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-none tracking-tight">
              Notification banners
            </h1>
            <p className="text-xs text-gray-500 mt-1 truncate">
              {active} active &middot; shown across the site, dashboard or admin.
            </p>
          </div>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="h-9 px-3.5 rounded-lg bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-sm font-medium inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          New banner
        </button>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#7B2D8E] animate-spin" />
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <Megaphone className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No banners yet.</p>
          <button
            onClick={() => setCreating(true)}
            className="mt-3 text-sm text-[#7B2D8E] font-medium hover:underline"
          >
            Create the first one
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <BannerRow
              key={b.id}
              banner={b}
              onEdit={() => setEditing(b)}
              onDelete={() => remove(b.id)}
              onToggle={() => toggleActive(b)}
            />
          ))}
        </div>
      )}

      {(creating || editing) && (
        <BannerEditor
          banner={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={() => {
            setCreating(false)
            setEditing(null)
            mutate()
          }}
        />
      )}
    </div>
  )
}

function BannerRow({
  banner,
  onEdit,
  onDelete,
  onToggle,
}: {
  banner: Banner
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const theme = variantTheme[banner.variant]
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Live preview */}
      <div className={`${theme.bg} ${theme.text} border-b ${theme.border} px-4 py-3 text-sm flex items-center gap-2`}>
        {variantIcon(banner.variant)}
        <span className="flex-1 line-clamp-2">{banner.message}</span>
        {banner.link_url && banner.link_text && (
          <span className={`text-xs font-semibold underline underline-offset-2 ${banner.variant === 'promo' ? 'text-white' : ''}`}>
            {banner.link_text}
          </span>
        )}
      </div>
      {/* Meta */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
          <span className="capitalize">{theme.label}</span>
          <span>&middot;</span>
          <span className="capitalize">Scope: {banner.scope}</span>
          {(banner.starts_at || banner.ends_at) && (
            <>
              <span>&middot;</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {fmtDate(banner.starts_at)} – {fmtDate(banner.ends_at)}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={banner.is_active}
            onCheckedChange={onToggle}
            className="data-[state=checked]:bg-[#7B2D8E]"
          />
          <button
            onClick={onEdit}
            className="h-8 w-8 rounded-md text-gray-500 hover:bg-gray-100 inline-flex items-center justify-center"
            aria-label="Edit"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="h-8 w-8 rounded-md text-gray-500 hover:bg-rose-50 hover:text-rose-600 inline-flex items-center justify-center"
            aria-label="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function variantIcon(v: Banner['variant']) {
  if (v === 'warning') return <AlertTriangle className="w-4 h-4 flex-shrink-0" />
  if (v === 'danger') return <ShieldAlert className="w-4 h-4 flex-shrink-0" />
  if (v === 'success') return <Check className="w-4 h-4 flex-shrink-0" />
  return <Info className="w-4 h-4 flex-shrink-0" />
}

function fmtDate(s: string | null) {
  if (!s) return 'always'
  return new Date(s).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
}

function BannerEditor({
  banner,
  onClose,
  onSaved,
}: {
  banner: Banner | null
  onClose: () => void
  onSaved: () => void
}) {
  const [message, setMessage] = useState(banner?.message ?? '')
  const [linkUrl, setLinkUrl] = useState(banner?.link_url ?? '')
  const [linkText, setLinkText] = useState(banner?.link_text ?? '')
  const [variant, setVariant] = useState<Banner['variant']>(banner?.variant ?? 'info')
  const [scope, setScope] = useState<Banner['scope']>(banner?.scope ?? 'site')
  const [dismissible, setDismissible] = useState(banner?.dismissible ?? true)
  const [isActive, setIsActive] = useState(banner?.is_active ?? true)
  const [startsAt, setStartsAt] = useState(banner?.starts_at?.slice(0, 16) ?? '')
  const [endsAt, setEndsAt] = useState(banner?.ends_at?.slice(0, 16) ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!message.trim()) return
    setSaving(true)
    const payload = {
      message: message.trim(),
      link_url: linkUrl.trim() || null,
      link_text: linkText.trim() || null,
      variant,
      scope,
      dismissible,
      is_active: isActive,
      starts_at: startsAt || null,
      ends_at: endsAt || null,
    }
    try {
      if (banner) {
        await fetch(`/api/admin/banners/${banner.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch('/api/admin/banners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            {banner ? 'Edit banner' : 'New banner'}
          </h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-md text-gray-500 hover:bg-gray-100 inline-flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={280}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none resize-none"
              placeholder="Up to 280 characters."
            />
            <p className="mt-1 text-[11px] text-gray-400 text-right">{message.length}/280</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Variant</label>
              <select
                value={variant}
                onChange={(e) => setVariant(e.target.value as Banner['variant'])}
                className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
              >
                <option value="info">Info (purple soft)</option>
                <option value="promo">Promo (purple solid)</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="danger">Danger</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Scope</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as Banner['scope'])}
                className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
              >
                <option value="site">Public site</option>
                <option value="dashboard">Dashboard only</option>
                <option value="admin">Admin only</option>
                <option value="all">Everywhere</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Link URL</label>
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://…"
                className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Link text</label>
              <input
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Learn more"
                className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Starts at</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Ends at</label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5">
            <div>
              <p className="text-sm font-medium text-gray-900">Dismissible</p>
              <p className="text-xs text-gray-500">Users can close the banner</p>
            </div>
            <Switch
              checked={dismissible}
              onCheckedChange={setDismissible}
              className="data-[state=checked]:bg-[#7B2D8E]"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5">
            <div>
              <p className="text-sm font-medium text-gray-900">Active</p>
              <p className="text-xs text-gray-500">Shown immediately when on</p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              className="data-[state=checked]:bg-[#7B2D8E]"
            />
          </div>
        </div>
        <footer className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="h-9 px-3.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 border border-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!message.trim() || saving}
            className="h-9 px-3.5 rounded-lg bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {banner ? 'Save changes' : 'Create banner'}
          </button>
        </footer>
      </div>
    </div>
  )
}
