'use client'

/**
 * Admin › Treatment rooms.
 *
 * Operational control panel for every physical room across all
 * Dermaspace branches. Admins can:
 *
 *   - Create, rename, and (soft-)delete rooms.
 *   - Set capacity and operational status (active / maintenance /
 *     closed). A "maintenance" or "closed" room is greyed out on the
 *     staff live-board and refuses check-ins.
 *   - See the current session per room (client, staff member,
 *     service, estimated end) so the page doubles as a live status
 *     monitor.
 *
 * The list polls every 10s with `keepPreviousData` so the live
 * session strip stays current while admins work elsewhere on the
 * page.
 *
 * Strictly on-brand: brand-purple + neutrals only, Lucide icons, no
 * gradient overlays / glow shadows / sparkle chrome.
 */

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  DoorOpen,
  DoorClosed,
  Wrench,
  Users as UsersIcon,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  MapPin,
  Clock,
  Check,
  X,
  CircleAlert,
} from 'lucide-react'

type Room = {
  id: string
  location_id: string
  location_name: string | null
  name: string
  capacity: number
  status: 'active' | 'maintenance' | 'closed'
  allowed_categories: string[] | null
  notes: string | null
  display_order: number
  is_active: boolean
  current_session: null | {
    id: string
    booking_id: string | null
    client_name: string
    staff_first_name: string | null
    staff_last_name: string | null
    service_label: string | null
    duration_minutes: number
    started_at: string
    estimated_end_at: string
  }
}

type RoomsResponse = {
  rooms: Room[]
  migrationRequired: boolean
}

type Location = {
  id: string
  name: string
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error('Request failed')
    return r.json()
  })

function statusMeta(s: Room['status']) {
  if (s === 'maintenance') {
    return {
      label: 'Maintenance',
      pill: 'bg-amber-50 text-amber-800 border border-amber-200',
      icon: Wrench,
    }
  }
  if (s === 'closed') {
    return {
      label: 'Closed',
      pill: 'bg-gray-100 text-gray-700 border border-gray-200',
      icon: DoorClosed,
    }
  }
  return {
    label: 'Active',
    pill: 'bg-[#7B2D8E]/10 text-[#7B2D8E] border border-[#7B2D8E]/20',
    icon: DoorOpen,
  }
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.max(0, Math.floor(ms / 60_000))
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m ago`
}

function endsIn(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'overdue'
  const m = Math.floor(ms / 60_000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

export default function AdminRoomsPage() {
  const { data, isLoading, mutate } = useSWR<RoomsResponse>(
    '/api/admin/rooms',
    fetcher,
    { refreshInterval: 10_000, keepPreviousData: true, revalidateOnFocus: true },
  )
  const { data: locationsData } = useSWR<{ locations: Location[] }>(
    '/api/admin/locations',
    fetcher,
  )

  const rooms = data?.rooms ?? []
  const migrationRequired = data?.migrationRequired ?? false
  const locations = locationsData?.locations ?? []

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Room | null>(null)

  // Group rooms by location so the page reads as "Victoria Island →
  // rooms" / "Ikoyi → rooms" rather than one undifferentiated list.
  const grouped = useMemo(() => {
    const map = new Map<string, { locationName: string; rooms: Room[] }>()
    for (const r of rooms) {
      const key = r.location_id
      const existing = map.get(key)
      if (existing) {
        existing.rooms.push(r)
      } else {
        map.set(key, {
          locationName: r.location_name ?? 'Unassigned branch',
          rooms: [r],
        })
      }
    }
    return Array.from(map.entries()).map(([id, group]) => ({ id, ...group }))
  }, [rooms])

  const stats = useMemo(() => {
    const total = rooms.length
    const active = rooms.filter((r) => r.status === 'active').length
    const occupied = rooms.filter((r) => r.current_session).length
    const maintenance = rooms.filter((r) => r.status === 'maintenance').length
    return { total, active, occupied, maintenance, free: active - occupied }
  }, [rooms])

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
            Treatment rooms
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage every room across all branches. Live session data refreshes
            automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          disabled={migrationRequired || locations.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#7B2D8E] text-white px-3.5 py-2 text-sm font-medium hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Add room
        </button>
      </header>

      {migrationRequired && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <CircleAlert className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              Migration required
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              Run <code className="font-mono text-[11px]">scripts/600-treatment-rooms.sql</code>{' '}
              against the database to enable room management.
            </p>
          </div>
        </div>
      )}

      {/* Summary tiles */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryTile label="Total rooms" value={stats.total} />
        <SummaryTile label="Active" value={stats.active} />
        <SummaryTile label="In use now" value={stats.occupied} />
        <SummaryTile label="Maintenance" value={stats.maintenance} />
      </section>

      {/* Room list grouped by location */}
      {isLoading && rooms.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading rooms…
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <DoorOpen className="w-7 h-7 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-900">No rooms yet</p>
          <p className="text-xs text-gray-500 mt-0.5 max-w-sm mx-auto">
            Add the rooms that exist in your branches so the front desk can
            check clients in and out.
          </p>
          {!migrationRequired && locations.length > 0 && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#7B2D8E] text-white px-3.5 py-2 text-sm font-medium hover:bg-[#5A1D6A] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create first room
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.id}>
              <div className="flex items-center gap-2 mb-2.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {group.locationName}
                </h2>
                <span className="text-[11px] text-gray-400">
                  {group.rooms.length} room{group.rooms.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {group.rooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onEdit={() => setEditing(room)}
                    onChanged={() => void mutate()}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {createOpen && (
        <RoomDialog
          locations={locations}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false)
            void mutate()
          }}
        />
      )}
      {editing && (
        <RoomDialog
          locations={locations}
          room={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void mutate()
          }}
        />
      )}
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-gray-900 tabular-nums">
        {value}
      </p>
    </div>
  )
}

function RoomCard({
  room,
  onEdit,
  onChanged,
}: {
  room: Room
  onEdit: () => void
  onChanged: () => void
}) {
  const meta = statusMeta(room.status)
  const Icon = meta.icon
  const occupied = !!room.current_session
  const [busy, setBusy] = useState(false)

  async function setStatus(next: Room['status']) {
    setBusy(true)
    try {
      await fetch(`/api/admin/rooms/${room.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm(`Delete "${room.name}"? Past sessions will be preserved.`)) return
    setBusy(true)
    try {
      const r = await fetch(`/api/admin/rooms/${room.id}`, { method: 'DELETE' })
      if (!r.ok) {
        const data = (await r.json().catch(() => null)) as { error?: string } | null
        alert(data?.error ?? 'Failed to delete room')
      } else {
        onChanged()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-[#7B2D8E]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {room.name}
            </h3>
            <span className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded ${meta.pill}`}>
              {meta.label}
            </span>
          </div>
          <p className="text-[11.5px] text-gray-500 mt-0.5 flex items-center gap-1.5">
            <UsersIcon className="w-3 h-3" />
            Capacity {room.capacity}
            {room.allowed_categories && room.allowed_categories.length > 0 && (
              <>
                <span className="text-gray-300">·</span>
                {room.allowed_categories.length} service{room.allowed_categories.length === 1 ? '' : 's'}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            disabled={busy}
            className="p-1.5 rounded-md text-gray-500 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-colors disabled:opacity-50"
            aria-label="Edit room"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="p-1.5 rounded-md text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
            aria-label="Delete room"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Live session strip */}
      <div className="px-4 py-3 bg-gray-50/40">
        {occupied ? (
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[#7B2D8E]">
              In session
            </p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">
              {room.current_session!.client_name}
            </p>
            <p className="text-[12px] text-gray-600 truncate">
              {room.current_session!.service_label || 'Service'}
              {(room.current_session!.staff_first_name || room.current_session!.staff_last_name) && (
                <>
                  {' · '}
                  {(room.current_session!.staff_first_name ?? '')}{' '}
                  {(room.current_session!.staff_last_name ?? '')}
                </>
              )}
            </p>
            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5 tabular-nums">
              <Clock className="w-3 h-3" />
              Started {timeAgo(room.current_session!.started_at)}
              <span className="text-gray-300">·</span>
              Ends in {endsIn(room.current_session!.estimated_end_at)}
            </p>
          </div>
        ) : (
          <p className="text-[12px] text-gray-500">
            Free — no active session.
          </p>
        )}
      </div>

      {/* Status quick-switch */}
      <div className="px-3 py-2 border-t border-gray-100 grid grid-cols-3 gap-1.5">
        {(['active', 'maintenance', 'closed'] as const).map((s) => {
          const isCurrent = room.status === s
          const label = s === 'active' ? 'Active' : s === 'maintenance' ? 'Maintenance' : 'Closed'
          return (
            <button
              key={s}
              type="button"
              disabled={busy || isCurrent}
              onClick={() => setStatus(s)}
              className={`text-[11px] py-1.5 rounded-md font-medium transition-colors ${
                isCurrent
                  ? 'bg-[#7B2D8E] text-white cursor-default'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:opacity-50'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </article>
  )
}

function RoomDialog({
  room,
  locations,
  onClose,
  onSaved,
}: {
  room?: Room
  locations: Location[]
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!room
  const [name, setName] = useState(room?.name ?? '')
  const [locationId, setLocationId] = useState(
    room?.location_id ?? locations[0]?.id ?? '',
  )
  const [capacity, setCapacity] = useState<number>(room?.capacity ?? 1)
  const [status, setStatus] = useState<Room['status']>(room?.status ?? 'active')
  const [notes, setNotes] = useState(room?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!locationId && locations[0]) setLocationId(locations[0].id)
  }, [locations, locationId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (isEdit && room) {
        const r = await fetch(`/api/admin/rooms/${room.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, capacity, status, notes }),
        })
        if (!r.ok) {
          const d = (await r.json().catch(() => null)) as { error?: string } | null
          throw new Error(d?.error ?? 'Failed to save')
        }
      } else {
        const r = await fetch(`/api/admin/rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locationId,
            name,
            capacity,
            status,
            notes: notes || null,
          }),
        })
        if (!r.ok) {
          const d = (await r.json().catch(() => null)) as { error?: string } | null
          throw new Error(d?.error ?? 'Failed to create')
        }
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            {isEdit ? 'Edit room' : 'Add room'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-5 space-y-3.5">
          {!isEdit && (
            <Field label="Branch">
              <select
                required
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#7B2D8E]"
              >
                {locations.length === 0 && <option value="">No branches available</option>}
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Room name">
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Suite A"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#7B2D8E]"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Capacity">
              <input
                type="number"
                min={1}
                max={20}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value) || 1)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#7B2D8E]"
              />
            </Field>
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Room['status'])}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#7B2D8E]"
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="closed">Closed</option>
              </select>
            </Field>
          </div>

          <Field label="Notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#7B2D8E] resize-none"
            />
          </Field>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 rounded-md px-2.5 py-1.5">
              {error}
            </p>
          )}
        </div>

        <footer className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-sm text-gray-700 hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#7B2D8E] text-white text-sm font-medium hover:bg-[#5A1D6A] transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {isEdit ? 'Save changes' : 'Create room'}
          </button>
        </footer>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
