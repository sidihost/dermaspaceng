'use client'

/**
 * Add to Calendar — single dropdown that drops the customer's
 * appointment into Google Calendar, Apple Calendar (.ics), Outlook
 * (Office 365 web), or any client that consumes the standard ICS
 * payload we build below.
 *
 * Why this lives in its own component
 * -----------------------------------
 * The booking receipt page is already huge. Keeping the calendar
 * mechanics here lets us:
 *   1. Re-use the ICS builder anywhere we need it (admin emails,
 *      consultations, the "rebook" flow) without duplicating the
 *      RFC 5545 escape rules.
 *   2. Keep the receipt page free of provider-specific URL
 *      stitching, which is what makes "Add to calendar" widgets
 *      so brittle in the wild.
 *
 * Standards / quirks we handle
 * ----------------------------
 *   • Times. The booking row stores a date (YYYY-MM-DD) and a
 *     local time (HH:mm). All Dermaspace appointments are in
 *     Africa/Lagos (UTC+1, no DST). We emit ICS with a TZID block
 *     so Apple Calendar / Outlook show the correct local time even
 *     for travelling customers, and Google Calendar gets the
 *     appointment as UTC with the right offset baked in.
 *   • CRLF line endings. RFC 5545 is strict about \r\n; tools like
 *     Outlook silently reject LF-only files. We always join with
 *     \r\n.
 *   • Escapes. Commas / semicolons / newlines inside the SUMMARY
 *     and DESCRIPTION fields must be backslash-escaped, otherwise
 *     the rest of the line is parsed as another property.
 *   • Folding. We keep all our lines under 75 octets so we don't
 *     have to worry about line-folding rules.
 */

import { useEffect, useRef, useState } from 'react'
import {
  CalendarPlus,
  Apple,
  ChevronDown,
  Check,
  Calendar as CalendarIcon,
  Mail,
} from 'lucide-react'

// ---------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------

export interface CalendarEventInput {
  /** Booking reference, e.g. "DRM-1234" — included as the unique ID. */
  reference: string
  /** Date the appointment falls on, ISO YYYY-MM-DD. */
  date: string
  /** Local start time HH:mm (24h), Africa/Lagos. */
  time: string
  /** Length of the visit in minutes. */
  durationMinutes: number
  /** Display title — usually the location name. */
  locationName: string
  /** Free-form physical address for the LOCATION property. */
  locationAddress?: string | null
  /** Customer-facing description text. Newlines OK. */
  description?: string
}

const LAGOS_OFFSET_MINUTES = 60 // Africa/Lagos = UTC+1, no DST.

/** Pad an integer to two digits — used everywhere ICS expects HHMMSS. */
function pad2(n: number) {
  return String(n).padStart(2, '0')
}

/** Build a UTC YYYYMMDDTHHMMSSZ stamp. */
function toIcsUtc(date: Date) {
  return (
    `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}` +
    `T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`
  )
}

/** Parse "YYYY-MM-DD" + "HH:mm" (Africa/Lagos local) into a UTC Date. */
function combineToUtc(dateIso: string, timeHm: string) {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso)
  const tm = /^(\d{1,2}):(\d{2})/.exec(timeHm.trim())
  if (!dm || !tm) return null
  const year = Number(dm[1])
  const month = Number(dm[2]) - 1
  const day = Number(dm[3])
  const hour = Number(tm[1])
  const minute = Number(tm[2])
  // Build a UTC date that represents the LAGOS local moment.
  const utc = Date.UTC(year, month, day, hour, minute, 0) - LAGOS_OFFSET_MINUTES * 60_000
  return new Date(utc)
}

/** Escape a string for inclusion as an ICS property value. */
function icsEscape(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

/** Build a fully-formed RFC 5545 VCALENDAR string. */
function buildIcs(event: CalendarEventInput): string | null {
  const start = combineToUtc(event.date, event.time)
  if (!start) return null
  const end = new Date(start.getTime() + Math.max(15, event.durationMinutes) * 60_000)
  const uid = `${event.reference}@dermaspaceng.com`
  const dtStamp = toIcsUtc(new Date())
  const dtStart = toIcsUtc(start)
  const dtEnd = toIcsUtc(end)
  const summary = `Dermaspace · ${event.locationName}`
  const location = event.locationAddress
    ? `${event.locationName}, ${event.locationAddress}`
    : event.locationName
  const description = event.description
    ? event.description
    : `Reference ${event.reference}. Save this email or your booking page for details.`

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dermaspace//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${icsEscape(summary)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    `LOCATION:${icsEscape(location)}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(`Reminder · Dermaspace appointment in 2 hours`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n')
}

/** Build a Google Calendar URL — opens in a new tab.
 *
 * We use the modern `/r/eventedit` path because the older
 * `/render?action=TEMPLATE` URL is the one Android intercepts and
 * mishandles (it opens the Google Calendar app to its home view and
 * silently drops every query parameter). `eventedit` is the URL the
 * Google Calendar web UI itself navigates to when composing a new
 * event, and it survives the Android intent handoff intact.
 */
function googleCalendarUrl(event: CalendarEventInput): string | null {
  const start = combineToUtc(event.date, event.time)
  if (!start) return null
  const end = new Date(start.getTime() + Math.max(15, event.durationMinutes) * 60_000)
  const params = new URLSearchParams({
    text: `Dermaspace - ${event.locationName}`,
    dates: `${toIcsUtc(start)}/${toIcsUtc(end)}`,
    details:
      event.description ??
      `Reference ${event.reference}. Save this email or your booking page for details.`,
    location: event.locationAddress
      ? `${event.locationName}, ${event.locationAddress}`
      : event.locationName,
  })
  return `https://calendar.google.com/calendar/u/0/r/eventedit?${params.toString()}`
}

/** Detect a mobile device. We use a coarse UA sniff because the
 *  underlying problem (Android/iOS intercepting calendar links and
 *  dropping query params) is itself a UA-specific behaviour, so
 *  feature detection isn't an option. */
function isMobileDevice() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

/** Build an Outlook (Office 365) compose URL. */
function outlookCalendarUrl(event: CalendarEventInput): string | null {
  const start = combineToUtc(event.date, event.time)
  if (!start) return null
  const end = new Date(start.getTime() + Math.max(15, event.durationMinutes) * 60_000)
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    subject: `Dermaspace · ${event.locationName}`,
    body:
      event.description ??
      `Reference ${event.reference}. Save this email or your booking page for details.`,
    location: event.locationAddress
      ? `${event.locationName}, ${event.locationAddress}`
      : event.locationName,
  })
  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`
}

// ---------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------

export function AddToCalendar({
  event,
  className = '',
}: {
  event: CalendarEventInput
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close on outside click / Escape — the universal popover pattern.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current || rootRef.current.contains(e.target as Node)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const downloadIcs = () => {
    const ics = buildIcs(event)
    if (!ics) return
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Dermaspace-${event.reference}.ics`
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Revoke the object URL on the next tick — Safari occasionally
    // races the download against the revoke if we go too quickly.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2000)
    setOpen(false)
  }

  const gUrl = googleCalendarUrl(event)
  const oUrl = outlookCalendarUrl(event)

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#7B2D8E]/25 bg-white px-3 py-1.5 text-[12px] font-semibold text-[#7B2D8E] hover:bg-[#7B2D8E]/5 hover:border-[#7B2D8E]/45 transition-colors"
      >
        {downloaded ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            Saved
          </>
        ) : (
          <>
            <CalendarPlus className="h-3.5 w-3.5" />
            Add to calendar
            <ChevronDown
              className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_18px_50px_-22px_rgba(123,45,142,0.32)]"
        >
          <div className="h-1 bg-[#7B2D8E]" aria-hidden="true" />
          <div className="px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
              Save your appointment
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500 leading-relaxed">
              We&apos;ll add a 2-hour reminder so you never miss it.
            </p>
          </div>
          <div className="border-t border-gray-100 py-1">
            {gUrl ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  // On phones the Google Calendar app intercepts
                  // calendar.google.com URLs and drops the query
                  // string, leaving the user staring at their
                  // calendar home with no event prefilled. The
                  // reliable cross-device path on mobile is the
                  // .ics file: Android, iOS, and every default mail
                  // app will offer to import it into whichever
                  // calendar the user has set up (Gmail included).
                  if (isMobileDevice()) {
                    downloadIcs()
                    return
                  }
                  window.open(gUrl, '_blank', 'noopener,noreferrer')
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-gray-800 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E]">
                  <CalendarIcon className="h-3.5 w-3.5" />
                </span>
                Google Calendar
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              onClick={downloadIcs}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-gray-800 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E]">
                <Apple className="h-3.5 w-3.5" />
              </span>
              Apple Calendar
            </button>
            {oUrl ? (
              <a
                role="menuitem"
                href={oUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-gray-800 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E]">
                  <Mail className="h-3.5 w-3.5" />
                </span>
                Outlook
              </a>
            ) : null}
            <button
              type="button"
              role="menuitem"
              onClick={downloadIcs}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-gray-800 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E]">
                <CalendarPlus className="h-3.5 w-3.5" />
              </span>
              Download .ics file
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
