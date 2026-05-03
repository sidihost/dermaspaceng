'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { ChevronLeft, ChevronRight, Calendar as CalIcon, AlertCircle } from 'lucide-react'
import type { WizardLocation, WizardServiceChoice } from './types'

interface DateTimeStepProps {
  location: WizardLocation
  services: WizardServiceChoice[]
  selectedDate: string | null
  selectedTime: string | null
  onChange: (date: string | null, time: string | null) => void
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function todayLagosISO(): string {
  // Lagos is UTC+1, no DST. Shift then truncate to YYYY-MM-DD.
  const lagos = new Date(Date.now() + 60 * 60 * 1000)
  return lagos.toISOString().slice(0, 10)
}

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map((n) => parseInt(n, 10))
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthGrid(yearMonth: string): { date: string; day: number; weekday: number; isInMonth: boolean }[] {
  const [y, m] = yearMonth.split('-').map((n) => parseInt(n, 10))
  const first = new Date(Date.UTC(y, m - 1, 1))
  const startWeekday = first.getUTCDay() // 0 = Sun
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()

  const cells: { date: string; day: number; weekday: number; isInMonth: boolean }[] = []
  // Pad with previous month days so the first row aligns with weekdays.
  for (let i = 0; i < startWeekday; i++) {
    const d = new Date(Date.UTC(y, m - 1, -i))
    cells.unshift({
      date: d.toISOString().slice(0, 10),
      day: d.getUTCDate(),
      weekday: d.getUTCDay(),
      isInMonth: false,
    })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(Date.UTC(y, m - 1, day))
    cells.push({
      date: d.toISOString().slice(0, 10),
      day,
      weekday: d.getUTCDay(),
      isInMonth: true,
    })
  }
  // Pad to a multiple of 7 so the grid renders cleanly.
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1]
    const [yy, mm, dd] = last.date.split('-').map((n) => parseInt(n, 10))
    const d = new Date(Date.UTC(yy, mm - 1, dd + 1))
    cells.push({
      date: d.toISOString().slice(0, 10),
      day: d.getUTCDate(),
      weekday: d.getUTCDay(),
      isInMonth: false,
    })
  }
  return cells
}

export function DateTimeStep({
  location,
  services,
  selectedDate,
  selectedTime,
  onChange,
}: DateTimeStepProps) {
  const today = todayLagosISO()
  const [yearMonth, setYearMonth] = useState<string>(today.slice(0, 7))

  // Reset time when date changes (a slot at 14:30 in the old date may
  // not exist in the new one).
  useEffect(() => {
    if (selectedDate && selectedTime) {
      // Re-validate via the availability fetch below; nothing to do here.
    }
  }, [selectedDate, selectedTime])

  const cells = useMemo(() => monthGrid(yearMonth), [yearMonth])
  const monthLabel = useMemo(() => {
    const [y, m] = yearMonth.split('-').map((n) => parseInt(n, 10))
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-NG', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }, [yearMonth])

  const servicesQuery = useMemo(
    () => services.map((s) => `${s.categoryId}:${s.treatmentId}`).join(','),
    [services],
  )

  const availabilityKey = selectedDate
    ? `/api/bookings/availability?locationId=${encodeURIComponent(location.id)}&date=${encodeURIComponent(selectedDate)}&services=${encodeURIComponent(servicesQuery)}`
    : null

  const { data, isLoading, error } = useSWR<{ slots?: string[]; error?: string }>(
    availabilityKey,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  )

  const slots = data?.slots ?? []

  const isDayDisabled = (cellDate: string, weekday: number, inMonth: boolean) => {
    if (!inMonth) return true
    if (cellDate < today) return true
    if (!location.open_days.includes(weekday)) return true
    return false
  }

  return (
    <div className="space-y-4">
      {/* Month header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setYearMonth(shiftMonth(yearMonth, -1))}
          disabled={yearMonth <= today.slice(0, 7)}
          className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
          <CalIcon className="h-4 w-4 text-[#7B2D8E]" aria-hidden="true" />
          {monthLabel}
        </div>
        <button
          type="button"
          onClick={() => setYearMonth(shiftMonth(yearMonth, 1))}
          className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        {DAY_LABELS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const disabled = isDayDisabled(cell.date, cell.weekday, cell.isInMonth)
          const isSelected = cell.date === selectedDate
          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => onChange(cell.date, null)}
              disabled={disabled}
              className={[
                'flex aspect-square items-center justify-center rounded-xl text-sm font-medium transition-colors',
                disabled
                  ? 'text-gray-300'
                  : isSelected
                    ? 'bg-[#7B2D8E] text-white shadow-sm'
                    : 'text-gray-900 hover:bg-[#7B2D8E]/10',
              ].join(' ')}
              aria-pressed={isSelected}
            >
              {cell.day}
            </button>
          )
        })}
      </div>

      {/* Time slots */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Available times
          </p>
          {selectedDate ? (
            <p className="text-[11px] text-gray-500">
              {new Date(`${selectedDate}T00:00:00.000Z`).toLocaleDateString('en-NG', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                timeZone: 'UTC',
              })}
            </p>
          ) : null}
        </div>

        {!selectedDate ? (
          <p className="text-sm text-gray-500">Pick a date to see open slots.</p>
        ) : isLoading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : error || data?.error ? (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-[12px] text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{data?.error || 'Could not load slots.'}</span>
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-gray-500">
            Fully booked for this day. Try another date.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => {
              const isSelected = selectedTime === slot
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => onChange(selectedDate, slot)}
                  className={[
                    'rounded-lg border px-2 py-2 text-sm font-medium transition-colors',
                    isSelected
                      ? 'border-[#7B2D8E] bg-[#7B2D8E] text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-900 hover:border-[#7B2D8E] hover:text-[#7B2D8E]',
                  ].join(' ')}
                >
                  {slot}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
