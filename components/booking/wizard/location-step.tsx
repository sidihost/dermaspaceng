'use client'

import { MapPin, Clock, Phone } from 'lucide-react'
import type { WizardLocation } from './types'

interface LocationStepProps {
  locations: WizardLocation[]
  loading: boolean
  selectedId: string | null
  onSelect: (id: string) => void
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function summariseDays(days: number[]): string {
  if (days.length === 0) return 'Closed'
  if (days.length === 7) return 'Open daily'
  // Compress contiguous ranges (Mon–Sat) where possible. Tiny helper
  // — we expect 5–6 day weeks so this is fine.
  const sorted = [...days].sort()
  const ranges: string[] = []
  let start = sorted[0]
  let prev = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i]
    if (d === prev + 1) {
      prev = d
      continue
    }
    ranges.push(start === prev ? DAY_LABELS[start] : `${DAY_LABELS[start]}–${DAY_LABELS[prev]}`)
    start = d
    prev = d
  }
  ranges.push(start === prev ? DAY_LABELS[start] : `${DAY_LABELS[start]}–${DAY_LABELS[prev]}`)
  return ranges.join(', ')
}

export function LocationStep({
  locations,
  loading,
  selectedId,
  onSelect,
}: LocationStepProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-gray-100 bg-gray-50"
          />
        ))}
      </div>
    )
  }

  if (locations.length === 0) {
    return (
      <p className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        No locations are accepting online bookings right now. Please call
        the front desk to book.
      </p>
    )
  }

  return (
    // Tighter rhythm (gap-2 instead of space-y-3) so two cards fit
    // comfortably above the action row on a 360px-wide phone — same
    // density as the Google Pay merchant picker / Vercel project
    // selector list.
    <div className="space-y-2">
      {selectedId && (
        <div className="rounded-lg bg-[#7B2D8E]/5 border border-[#7B2D8E]/15 px-3 py-2">
          <p className="text-xs font-medium text-[#7B2D8E]">
            ✓ Based on your preference
          </p>
        </div>
      )}
      {locations.map((loc) => {
        const isSelected = selectedId === loc.id
        return (
          <button
            key={loc.id}
            type="button"
            onClick={() => onSelect(loc.id)}
            className={[
              'group flex w-full gap-3 rounded-2xl border p-3 text-left transition-all',
              isSelected
                ? 'border-[#7B2D8E] bg-[#7B2D8E]/5 shadow-sm'
                : 'border-gray-200 bg-white hover:border-[#7B2D8E]/40',
            ].join(' ')}
          >
            <span
              className={[
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                isSelected ? 'bg-[#7B2D8E] text-white' : 'bg-[#7B2D8E]/10 text-[#7B2D8E]',
              ].join(' ')}
              aria-hidden="true"
            >
              <MapPin className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{loc.name}</p>
              <p className="mt-0.5 text-[12px] text-gray-500 line-clamp-2">{loc.address}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {/* Hours vary per weekday; the per-day window in
                      lib/booking.ts governs actual slot availability. */}
                  {loc.open_days.includes(0)
                    ? 'Sun-Mon 1pm-7pm · Tue-Thu 10am-7pm · Fri-Sat 10am-10pm'
                    : 'Tue-Thu 10am-7pm · Fri-Sat 10am-10pm'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="font-medium text-gray-600">
                    {summariseDays(loc.open_days)}
                  </span>
                </span>
                <a
                  href={`tel:${loc.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[#7B2D8E] hover:underline"
                >
                  <Phone className="h-3 w-3" aria-hidden="true" />
                  Call
                </a>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
