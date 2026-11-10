'use client'

/**
 * Christmas / Festive Feature Flag Row
 * ---------------------------------------------------------------
 * Matches the exact styling, typography, and 3-way segmented control
 * of the standard Feature Flags console. Flat design, zero gradients,
 * zero drop shadows, brand purple (#7B2D8E).
 */

import { useState } from 'react'
import useSWR from 'swr'
import { Bell, Loader2, EyeOff, Users, Globe } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Visibility = 'on' | 'preview' | 'off'

const VISIBILITY_OPTIONS: {
  value: Visibility
  label: string
  icon: typeof Globe
}[] = [
  { value: 'off', label: 'Off', icon: EyeOff },
  { value: 'preview', label: 'Admin only', icon: Users },
  { value: 'on', label: 'Everyone', icon: Globe },
]

export function ChristmasToggleCard() {
  const { data, mutate } = useSWR<{ enabled: boolean; visibility?: Visibility }>(
    '/api/festive',
    fetcher,
    { revalidateOnFocus: false },
  )

  const [saving, setSaving] = useState(false)

  const isEnabled = data ? data.enabled !== false : true
  const currentVisibility: Visibility = data?.visibility || (isEnabled ? 'on' : 'off')

  const handleVisibilityChange = async (vis: Visibility) => {
    setSaving(true)
    const enabled = vis !== 'off'

    // Optimistic update
    mutate({ enabled, visibility: vis }, { revalidate: false })

    try {
      await fetch('/api/festive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, visibility: vis }),
      })
    } catch {
      mutate()
    } finally {
      setSaving(false)
      mutate()
    }
  }

  const statusLabel =
    currentVisibility === 'on'
      ? { label: 'Everyone', className: 'text-[#7B2D8E]' }
      : currentVisibility === 'preview'
        ? { label: 'Admins only', className: 'text-amber-600' }
        : { label: 'Off', className: 'text-gray-400' }

  return (
    <div className="bg-white px-5 py-4 flex items-start gap-4 flex-col lg:flex-row lg:items-center border border-gray-200 rounded-2xl">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span
          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            currentVisibility !== 'off'
              ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
              : 'bg-gray-100 text-gray-400'
          }`}
        >
          <Bell className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">
              Christmas & holiday features
            </h3>
            <span className="text-[10px] font-mono text-gray-400 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5">
              festive
            </span>
            <span className="text-[10px] font-medium text-gray-500 capitalize">
              Public site
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Subtle holiday snowfall, festive bells, and Santa hat accent on the Dermaspace logo.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 self-stretch lg:self-center">
        <span
          className={`text-[11px] font-semibold uppercase tracking-wide w-20 text-right ${statusLabel.className}`}
        >
          {statusLabel.label}
        </span>
        {saving && (
          <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin flex-shrink-0" />
        )}
        <div
          role="radiogroup"
          aria-label="Christmas & holiday features visibility"
          className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg"
        >
          {VISIBILITY_OPTIONS.map((opt) => {
            const OptIcon = opt.icon
            const selected = currentVisibility === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={saving}
                onClick={() => handleVisibilityChange(opt.value)}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 h-8 rounded-md transition-colors ${
                  selected
                    ? opt.value === 'off'
                      ? 'bg-white text-gray-700'
                      : opt.value === 'preview'
                        ? 'bg-white text-amber-600'
                        : 'bg-white text-[#7B2D8E]'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <OptIcon className="w-3.5 h-3.5" aria-hidden />
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ChristmasToggleCard

