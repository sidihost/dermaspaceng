'use client'

/**
 * /admin/vouchers
 *
 * Coupon / voucher console. Admins can mint codes (percent or fixed),
 * cap usage, schedule them, and disable them. Each row shows the
 * redemption count and a copy-code shortcut.
 */

import useSWR from 'swr'
import { useState } from 'react'
import {
  Tag,
  Plus,
  Loader2,
  Trash2,
  Edit3,
  X,
  Check,
  Copy,
  Percent,
  Banknote,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'

type Voucher = {
  id: string
  code: string
  label: string | null
  description: string | null
  type: 'percent' | 'fixed'
  value: number
  max_discount: number | null
  min_amount: number
  max_uses: number | null
  used_count: number
  per_user_limit: number | null
  applies_to: string
  starts_at: string | null
  expires_at: string | null
  is_active: boolean
  created_at: string
  redemption_count: number
}

const fetcher = (u: string) => fetch(u).then((r) => r.json())

export default function VouchersPage() {
  const { data, isLoading, mutate } = useSWR<{ vouchers: Voucher[] }>(
    '/api/admin/vouchers',
    fetcher,
  )
  const [editing, setEditing] = useState<Voucher | null>(null)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const vouchers = data?.vouchers ?? []
  const activeCount = vouchers.filter((v) => v.is_active).length
  const totalRedemptions = vouchers.reduce((s, v) => s + (v.redemption_count || 0), 0)

  const remove = async (id: string) => {
    if (!confirm('Delete this voucher? Existing redemptions will be removed too.')) return
    await fetch(`/api/admin/vouchers/${id}`, { method: 'DELETE' })
    mutate()
  }

  const toggleActive = async (v: Voucher) => {
    mutate(
      (prev) => prev && {
        vouchers: prev.vouchers.map((x) => (x.id === v.id ? { ...x, is_active: !v.is_active } : x)),
      },
      { revalidate: false },
    )
    await fetch(`/api/admin/vouchers/${v.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !v.is_active }),
    })
    mutate()
  }

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied(null), 1500)
    } catch {}
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
            <Tag className="w-4 h-4 text-[#7B2D8E]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-none tracking-tight">
              Vouchers
            </h1>
            <p className="text-xs text-gray-500 mt-1 truncate">
              {activeCount} active &middot; {totalRedemptions} total redemptions
            </p>
          </div>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="h-9 px-3.5 rounded-lg bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-sm font-medium inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          New voucher
        </button>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#7B2D8E] animate-spin" />
        </div>
      ) : vouchers.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <Tag className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No vouchers yet.</p>
          <button
            onClick={() => setCreating(true)}
            className="mt-3 text-sm text-[#7B2D8E] font-medium hover:underline"
          >
            Mint your first voucher
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full hidden md:table">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left font-medium px-5 py-3">Code</th>
                <th className="text-left font-medium px-5 py-3">Discount</th>
                <th className="text-left font-medium px-5 py-3">Used</th>
                <th className="text-left font-medium px-5 py-3">Expires</th>
                <th className="text-left font-medium px-5 py-3">Active</th>
                <th className="text-right font-medium px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vouchers.map((v) => (
                <tr key={v.id} className="text-sm">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-gray-900">{v.code}</span>
                      <button
                        onClick={() => copy(v.code)}
                        className="text-gray-400 hover:text-[#7B2D8E]"
                        aria-label="Copy code"
                      >
                        {copied === v.code ? (
                          <Check className="w-3.5 h-3.5 text-[#7B2D8E]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    {v.label && <p className="text-xs text-gray-500 mt-0.5">{v.label}</p>}
                  </td>
                  <td className="px-5 py-3 text-gray-700">{formatDiscount(v)}</td>
                  <td className="px-5 py-3 text-gray-700">
                    {v.redemption_count}
                    {v.max_uses != null && ` / ${v.max_uses}`}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {v.expires_at ? new Date(v.expires_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-5 py-3">
                    <Switch
                      checked={v.is_active}
                      onCheckedChange={() => toggleActive(v)}
                      className="data-[state=checked]:bg-[#7B2D8E]"
                    />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => setEditing(v)}
                        className="h-8 w-8 rounded-md text-gray-500 hover:bg-gray-100 inline-flex items-center justify-center"
                        aria-label="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => remove(v.id)}
                        className="h-8 w-8 rounded-md text-gray-500 hover:bg-rose-50 hover:text-rose-600 inline-flex items-center justify-center"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <ul className="md:hidden divide-y divide-gray-100">
            {vouchers.map((v) => (
              <li key={v.id} className="px-4 py-3.5 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-gray-900 text-sm">{v.code}</span>
                    <button
                      onClick={() => copy(v.code)}
                      className="text-gray-400 hover:text-[#7B2D8E]"
                      aria-label="Copy code"
                    >
                      {copied === v.code ? (
                        <Check className="w-3.5 h-3.5 text-[#7B2D8E]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDiscount(v)} &middot; Used {v.redemption_count}
                    {v.max_uses != null && ` / ${v.max_uses}`}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {v.expires_at
                      ? `Expires ${new Date(v.expires_at).toLocaleDateString()}`
                      : 'Never expires'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Switch
                    checked={v.is_active}
                    onCheckedChange={() => toggleActive(v)}
                    className="data-[state=checked]:bg-[#7B2D8E]"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditing(v)}
                      className="h-7 w-7 rounded-md text-gray-500 hover:bg-gray-100 inline-flex items-center justify-center"
                      aria-label="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => remove(v.id)}
                      className="h-7 w-7 rounded-md text-gray-500 hover:bg-rose-50 hover:text-rose-600 inline-flex items-center justify-center"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(creating || editing) && (
        <VoucherEditor
          voucher={editing}
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

function formatDiscount(v: Voucher) {
  return v.type === 'percent'
    ? `${Number(v.value)}% off${v.max_discount ? ` (max ₦${Number(v.max_discount).toLocaleString()})` : ''}`
    : `₦${Number(v.value).toLocaleString()} off`
}

function VoucherEditor({
  voucher,
  onClose,
  onSaved,
}: {
  voucher: Voucher | null
  onClose: () => void
  onSaved: () => void
}) {
  const [code, setCode] = useState(voucher?.code ?? '')
  const [label, setLabel] = useState(voucher?.label ?? '')
  const [description, setDescription] = useState(voucher?.description ?? '')
  const [type, setType] = useState<'percent' | 'fixed'>(voucher?.type ?? 'percent')
  const [value, setValue] = useState(voucher ? String(voucher.value) : '10')
  const [maxDiscount, setMaxDiscount] = useState(voucher?.max_discount ? String(voucher.max_discount) : '')
  const [minAmount, setMinAmount] = useState(voucher?.min_amount ? String(voucher.min_amount) : '')
  const [maxUses, setMaxUses] = useState(voucher?.max_uses ? String(voucher.max_uses) : '')
  const [perUserLimit, setPerUserLimit] = useState(voucher?.per_user_limit ? String(voucher.per_user_limit) : '1')
  const [appliesTo, setAppliesTo] = useState(voucher?.applies_to ?? 'all')
  const [startsAt, setStartsAt] = useState(voucher?.starts_at?.slice(0, 16) ?? '')
  const [expiresAt, setExpiresAt] = useState(voucher?.expires_at?.slice(0, 16) ?? '')
  const [isActive, setIsActive] = useState(voucher?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setError('')
    setSaving(true)
    const payload = {
      code,
      label: label || null,
      description: description || null,
      type,
      value,
      max_discount: maxDiscount,
      min_amount: minAmount,
      max_uses: maxUses,
      per_user_limit: perUserLimit,
      applies_to: appliesTo,
      starts_at: startsAt || null,
      expires_at: expiresAt || null,
      is_active: isActive,
    }
    try {
      const res = voucher
        ? await fetch(`/api/admin/vouchers/${voucher.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/vouchers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to save voucher')
        return
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            {voucher ? 'Edit voucher' : 'New voucher'}
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
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={!!voucher}
                placeholder="WELCOME10"
                className="w-full h-10 px-3 text-sm font-mono rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none disabled:bg-gray-50 disabled:text-gray-500"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                {voucher ? 'Code is locked once a voucher is created.' : 'Customers will type this exactly.'}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Label</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Welcome 10% off"
                className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none resize-none"
              placeholder="Internal notes / what this voucher is for."
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('percent')}
              className={`flex items-center gap-2 px-3 h-10 rounded-lg border text-sm font-medium ${
                type === 'percent'
                  ? 'border-[#7B2D8E] bg-[#7B2D8E]/5 text-[#7B2D8E]'
                  : 'border-gray-200 text-gray-700'
              }`}
            >
              <Percent className="w-4 h-4" /> Percent
            </button>
            <button
              type="button"
              onClick={() => setType('fixed')}
              className={`flex items-center gap-2 px-3 h-10 rounded-lg border text-sm font-medium ${
                type === 'fixed'
                  ? 'border-[#7B2D8E] bg-[#7B2D8E]/5 text-[#7B2D8E]'
                  : 'border-gray-200 text-gray-700'
              }`}
            >
              <Banknote className="w-4 h-4" /> Fixed amount
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                {type === 'percent' ? 'Percent off' : 'Amount off (₦)'}
              </label>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ''))}
                inputMode="decimal"
                className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
              />
            </div>
            {type === 'percent' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Max discount (₦)</label>
                <input
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="optional"
                  inputMode="decimal"
                  className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Min spend (₦)</label>
              <input
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                inputMode="decimal"
                className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Max total uses</label>
              <input
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="unlimited"
                inputMode="numeric"
                className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Per user limit</label>
              <input
                value={perUserLimit}
                onChange={(e) => setPerUserLimit(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="1"
                inputMode="numeric"
                className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Applies to</label>
              <select
                value={appliesTo}
                onChange={(e) => setAppliesTo(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
              >
                <option value="all">Everything</option>
                <option value="services">Services only</option>
                <option value="packages">Packages only</option>
                <option value="gift_cards">Gift cards only</option>
                <option value="bookings">Bookings only</option>
              </select>
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
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Expires at</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5">
            <div>
              <p className="text-sm font-medium text-gray-900">Active</p>
              <p className="text-xs text-gray-500">Customers can redeem when on</p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              className="data-[state=checked]:bg-[#7B2D8E]"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
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
            disabled={!code.trim() || !value || saving}
            className="h-9 px-3.5 rounded-lg bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {voucher ? 'Save changes' : 'Create voucher'}
          </button>
        </footer>
      </div>
    </div>
  )
}
