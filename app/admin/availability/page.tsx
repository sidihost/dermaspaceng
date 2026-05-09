'use client'

/**
 * Admin → Availability
 *
 * Lets admins manage the booking calendar end-to-end without an SQL
 * console:
 *   • Per-branch opens-at / closes-at window
 *   • Open-days picker (Sun → Sat)
 *   • Slot duration (granularity at which the picker generates times)
 *   • Concurrent capacity (how many bookings can share one slot)
 *   • Per-branch on/off switch — paused branches drop out of the
 *     public booking wizard immediately.
 *
 * Persistence goes through PATCH /api/admin/locations/[id]; the page
 * uses SWR for the GET so flipping a switch and saving doesn't
 * require a full reload.
 */

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, Save, MapPin, Clock, Users2, CheckCircle2, AlertCircle } from 'lucide-react'

interface Location {
  id: string
  name: string
  address: string
  phone: string
  whatsapp: string
  opens_at: string
  closes_at: string
  // Postgres stores this as a CSV ("1,2,3,4,5,6"); we normalise to
  // an int array on the client so the day toggles are easy to build.
  open_days: string
  slot_minutes: number
  slots_per_window: number
  is_active: boolean
  display_order: number
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json())

const WEEKDAYS = [
  { idx: 1, label: 'Mon' },
  { idx: 2, label: 'Tue' },
  { idx: 3, label: 'Wed' },
  { idx: 4, label: 'Thu' },
  { idx: 5, label: 'Fri' },
  { idx: 6, label: 'Sat' },
  { idx: 0, label: 'Sun' },
] as const

export default function AdminAvailabilityPage() {
  const { data, isLoading, mutate } = useSWR<{ locations: Location[] }>(
    '/api/admin/locations',
    fetcher,
    { revalidateOnFocus: false },
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#7B2D8E]" />
      </div>
    )
  }

  const locations = data?.locations ?? []

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Availability</h1>
          <p className="text-sm text-gray-500 mt-1">
            Per-branch opening hours, slot duration and concurrent capacity. Changes
            apply to the public booking wizard within a minute.
          </p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        {locations.map((loc) => (
          <LocationEditor key={loc.id} location={loc} onSaved={() => mutate()} />
        ))}
      </div>

      {locations.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-gray-500">
              No booking locations have been set up yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function parseDays(csv: string): number[] {
  return csv
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
}

function LocationEditor({
  location,
  onSaved,
}: {
  location: Location
  onSaved: () => void
}) {
  // Local form state. We snapshot the server row on mount and reset
  // every time the parent re-renders us with fresher data so the
  // form never drifts after a save.
  const [opensAt, setOpensAt] = useState(location.opens_at)
  const [closesAt, setClosesAt] = useState(location.closes_at)
  const [days, setDays] = useState<number[]>(parseDays(location.open_days))
  const [slotMinutes, setSlotMinutes] = useState<number>(location.slot_minutes)
  const [slotsPerWindow, setSlotsPerWindow] = useState<number>(location.slots_per_window)
  const [isActive, setIsActive] = useState<boolean>(location.is_active)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    setOpensAt(location.opens_at)
    setClosesAt(location.closes_at)
    setDays(parseDays(location.open_days))
    setSlotMinutes(location.slot_minutes)
    setSlotsPerWindow(location.slots_per_window)
    setIsActive(location.is_active)
  }, [location])

  const dirty =
    opensAt !== location.opens_at ||
    closesAt !== location.closes_at ||
    JSON.stringify([...days].sort()) !== JSON.stringify(parseDays(location.open_days).sort()) ||
    slotMinutes !== location.slot_minutes ||
    slotsPerWindow !== location.slots_per_window ||
    isActive !== location.is_active

  const toggleDay = (idx: number) => {
    setDays((prev) => (prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]))
  }

  // Preview the actual slot ladder that customers will see, so the
  // admin can spot a typo (e.g. closes_at < opens_at) before saving.
  const slotPreview = useMemo(() => {
    const [oh, om] = opensAt.split(':').map((s) => parseInt(s, 10))
    const [ch, cm] = closesAt.split(':').map((s) => parseInt(s, 10))
    if ([oh, om, ch, cm].some((n) => !Number.isFinite(n))) return [] as string[]
    const start = oh * 60 + om
    const end = ch * 60 + cm
    if (end <= start || slotMinutes <= 0) return [] as string[]
    const out: string[] = []
    for (let t = start; t < end && out.length < 60; t += slotMinutes) {
      const h = Math.floor(t / 60)
      const m = t % 60
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
    return out
  }, [opensAt, closesAt, slotMinutes])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/locations/${location.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opens_at: opensAt,
          closes_at: closesAt,
          open_days: days,
          slot_minutes: slotMinutes,
          slots_per_window: slotsPerWindow,
          is_active: isActive,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      setSavedAt(Date.now())
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-gray-100">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-[#7B2D8E]" />
              {location.name}
            </CardTitle>
            <CardDescription className="text-xs mt-1 line-clamp-1">
              {location.address}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor={`active-${location.id}`} className="text-xs text-gray-600">
              {isActive ? 'Open' : 'Paused'}
            </Label>
            <Switch
              id={`active-${location.id}`}
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Opening window */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`opens-${location.id}`} className="text-xs font-semibold text-gray-700 mb-1 block">
              Opens at
            </Label>
            <Input
              id={`opens-${location.id}`}
              type="time"
              value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`closes-${location.id}`} className="text-xs font-semibold text-gray-700 mb-1 block">
              Closes at
            </Label>
            <Input
              id={`closes-${location.id}`}
              type="time"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
            />
          </div>
        </div>

        {/* Days of week */}
        <div>
          <Label className="text-xs font-semibold text-gray-700 mb-2 block">
            Open on
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((d) => {
              const on = days.includes(d.idx)
              return (
                <button
                  key={d.idx}
                  type="button"
                  onClick={() => toggleDay(d.idx)}
                  className={
                    'h-9 px-3 rounded-lg text-xs font-semibold transition-colors border ' +
                    (on
                      ? 'bg-[#7B2D8E] text-white border-[#7B2D8E]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E]')
                  }
                >
                  {d.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Slot config */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`slot-${location.id}`} className="text-xs font-semibold text-gray-700 mb-1 block">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Slot duration (min)
              </span>
            </Label>
            <Input
              id={`slot-${location.id}`}
              type="number"
              min={5}
              max={240}
              step={5}
              value={slotMinutes}
              onChange={(e) => setSlotMinutes(parseInt(e.target.value || '0', 10))}
            />
          </div>
          <div>
            <Label htmlFor={`cap-${location.id}`} className="text-xs font-semibold text-gray-700 mb-1 block">
              <span className="inline-flex items-center gap-1">
                <Users2 className="h-3 w-3" />
                Concurrent bookings
              </span>
            </Label>
            <Input
              id={`cap-${location.id}`}
              type="number"
              min={1}
              max={50}
              value={slotsPerWindow}
              onChange={(e) => setSlotsPerWindow(parseInt(e.target.value || '0', 10))}
            />
          </div>
        </div>

        {/* Live slot preview */}
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-2">
            Slot preview
          </p>
          {slotPreview.length === 0 ? (
            <p className="text-xs text-rose-600 inline-flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              Closing time must be after opening time.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {slotPreview.slice(0, 24).map((s) => (
                <span
                  key={s}
                  className="text-[11px] tabular-nums px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-700"
                >
                  {s}
                </span>
              ))}
              {slotPreview.length > 24 && (
                <span className="text-[11px] text-gray-500 px-1.5 py-0.5">
                  +{slotPreview.length - 24} more
                </span>
              )}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-rose-600 inline-flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          {savedAt && !dirty ? (
            <p className="text-xs text-emerald-700 inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Saved
            </p>
          ) : (
            <span className="text-[11px] text-gray-400">
              {dirty ? 'Unsaved changes' : 'No changes'}
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || !dirty || slotPreview.length === 0}
            className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
