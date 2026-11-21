'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Laptop,
  Loader2,
  Mail,
  MapPin,
  Monitor,
  Phone,
  Receipt,
  Shield,
  Smartphone,
  Star,
  Tablet,
  Ticket,
  UserRound,
  Wallet,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getReceiptHref } from '@/lib/receipt-access'
import { getTicketStatusMeta } from '@/lib/support-and-chat'
import { formatChatTimestamp, type VisitorMetadata } from '@/lib/visitor-telemetry'

export interface InspectorContextData {
  isGuest?: boolean
  visitor?: Partial<VisitorMetadata> | null
  user: {
    id?: string | null
    firstName?: string
    lastName?: string
    email: string
    phone: string | null
    avatarUrl?: string | null
    memberSince: string
    isActive: boolean
  }
  wallet: { formatted: string }
  transactions: Array<{
    id: number
    reference?: string | null
    type: string
    amount: number
    status: string
    payment_method: string | null
    description: string | null
    metadata?: { booking_reference?: string; type?: string } | null
    created_at: string
  }>
  bookings: Array<{
    id: number
    booking_reference: string
    location_name: string
    appointment_date: string
    status: string
    total_price: number
  }>
  tickets: Array<{
    ticket_id: string
    category: string
    subject: string
    status: string
  }>
}

interface LiveChatInspectorProps {
  customerName: string
  customerEmail: string
  customerPhone: string | null
  customerAvatarUrl: string | null
  supportCode: string
  isGuest: boolean
  topic: string | null
  escalatedAt: string
  rating: number | null
  ratingComment: string | null
  visitorFallback?: Partial<VisitorMetadata> | null
  data: InspectorContextData | undefined
  loading: boolean
  onDownloadTranscript: () => void
  onClose?: () => void
}

function formatVisitorLocalTime(timezone: string | null | undefined): string | null {
  if (!timezone) return null
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date())
  } catch {
    return null
  }
}

export function LiveChatInspector({
  customerName,
  customerEmail,
  customerPhone,
  customerAvatarUrl,
  supportCode,
  isGuest,
  topic,
  escalatedAt,
  rating,
  ratingComment,
  visitorFallback,
  data,
  loading,
  onDownloadTranscript,
  onClose,
}: LiveChatInspectorProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const visitor = useMemo<Partial<VisitorMetadata>>(() => {
    return {
      location: data?.visitor?.location ?? visitorFallback?.location ?? null,
      ip: data?.visitor?.ip ?? visitorFallback?.ip ?? null,
      browser: data?.visitor?.browser ?? visitorFallback?.browser ?? null,
      os: data?.visitor?.os ?? visitorFallback?.os ?? null,
      device: data?.visitor?.device ?? visitorFallback?.device ?? null,
      timezone: data?.visitor?.timezone ?? visitorFallback?.timezone ?? null,
      pageUrl: data?.visitor?.pageUrl ?? visitorFallback?.pageUrl ?? null,
      referrer: data?.visitor?.referrer ?? visitorFallback?.referrer ?? null,
      language: data?.visitor?.language ?? visitorFallback?.language ?? null,
      screen: data?.visitor?.screen ?? visitorFallback?.screen ?? null,
    }
  }, [data?.visitor, visitorFallback])

  const localTime = useMemo(
    () => formatVisitorLocalTime(visitor.timezone),
    [visitor.timezone],
  )

  const copyValue = (key: string, value: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopiedField(key)
        window.setTimeout(() => setCopiedField(null), 1600)
      })
      .catch(() => {})
  }

  const effectiveGuest = data?.isGuest ?? isGuest
  const initials = customerName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || '?'

  const DeviceIcon =
    visitor.device === 'Mobile'
      ? Smartphone
      : visitor.device === 'Tablet'
        ? Tablet
        : Laptop

  const deviceSummary = [visitor.device, visitor.screen]
    .filter(Boolean)
    .join(' · ')

  const timezoneSummary = visitor.timezone
    ? localTime
      ? `${visitor.timezone} (${localTime})`
      : visitor.timezone
    : null

  return (
    <aside className="h-full flex flex-col bg-white overflow-hidden">
      {/* Top inspector header */}
      <div className="h-[68px] shrink-0 px-4 border-b border-gray-200 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-gray-900 truncate">
            {effectiveGuest ? 'Visitor & Contact Details' : 'Customer Profile'}
          </h2>
          <p className="text-[11px] text-gray-500 truncate mt-0.5">
            {effectiveGuest ? 'Anonymous guest session' : 'Registered Dermaspace member'}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details panel"
            className="w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scrollable inspector body */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {/* Identity & Contact */}
        <section className="p-4 space-y-3.5">
          <div className="flex items-center gap-3">
            {customerAvatarUrl ? (
              <Image
                src={customerAvatarUrl}
                alt={customerName}
                width={44}
                height={44}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-full object-cover border border-gray-200 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 text-[#7B2D8E] flex items-center justify-center text-[13px] font-semibold shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-gray-900 truncate">
                {customerName}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                <span className={effectiveGuest ? 'text-[#7B2D8E] font-medium' : 'text-gray-600'}>
                  {effectiveGuest ? 'Anonymous Visitor' : 'Member'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[#5A1D6A] font-medium">
                  {supportCode}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-0.5">
            <DetailRow
              icon={<Mail className="w-3.5 h-3.5" />}
              label="Email"
              value={data?.user?.email || customerEmail}
              onCopy={
                (data?.user?.email || customerEmail)
                  ? () => copyValue('email', data?.user?.email || customerEmail)
                  : undefined
              }
              copied={copiedField === 'email'}
            />
            {(data?.user?.phone || customerPhone) && (
              <DetailRow
                icon={<Phone className="w-3.5 h-3.5" />}
                label="Phone"
                value={data?.user?.phone || customerPhone || ''}
                onCopy={() =>
                  copyValue('phone', data?.user?.phone || customerPhone || '')
                }
                copied={copiedField === 'phone'}
              />
            )}
            <DetailRow
              icon={<Ticket className="w-3.5 h-3.5" />}
              label="Support ID"
              value={supportCode}
              mono
              onCopy={() => copyValue('support', supportCode)}
              copied={copiedField === 'support'}
            />
            <DetailRow
              icon={<Clock className="w-3.5 h-3.5" />}
              label="Started"
              value={formatChatTimestamp(escalatedAt) || 'Just now'}
            />
          </div>
        </section>

        {/* Visitor Environment — Location, Browser, OS, Device, Page, IP */}
        <section className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-semibold text-gray-900 tracking-wide">
              Visitor Environment
            </h3>
            {visitor.location && (
              <span className="text-[11px] font-medium text-[#7B2D8E] truncate max-w-[165px]">
                {visitor.location}
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            <DetailRow
              icon={<MapPin className="w-3.5 h-3.5" />}
              label="Location"
              value={visitor.location || 'Not detected'}
              muted={!visitor.location}
            />
            <DetailRow
              icon={<Globe className="w-3.5 h-3.5" />}
              label="Browser"
              value={visitor.browser || 'Not captured'}
              muted={!visitor.browser}
            />
            <DetailRow
              icon={<Monitor className="w-3.5 h-3.5" />}
              label="Operating system"
              value={visitor.os || 'Not captured'}
              muted={!visitor.os}
            />
            <DetailRow
              icon={<DeviceIcon className="w-3.5 h-3.5" />}
              label="Device & viewport"
              value={deviceSummary || 'Not captured'}
              muted={!deviceSummary}
            />
            {timezoneSummary && (
              <DetailRow
                icon={<Clock className="w-3.5 h-3.5" />}
                label="Timezone"
                value={timezoneSummary}
              />
            )}
            {visitor.pageUrl && (
              <div className="flex items-start gap-2.5 text-[12px]">
                <span className="mt-0.5 text-[#7B2D8E] shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10.5px] text-gray-400">Started on page</p>
                  {visitor.pageUrl.startsWith('/') ? (
                    <Link
                      href={visitor.pageUrl}
                      className="text-[12px] font-medium text-[#7B2D8E] hover:underline break-all block mt-0.5"
                    >
                      {visitor.pageUrl}
                    </Link>
                  ) : (
                    <p className="text-[12px] font-medium text-gray-800 break-all mt-0.5">
                      {visitor.pageUrl}
                    </p>
                  )}
                </div>
              </div>
            )}
            {visitor.ip && (
              <DetailRow
                icon={<Shield className="w-3.5 h-3.5" />}
                label="IP address"
                value={visitor.ip}
                mono
                onCopy={() => copyValue('ip', visitor.ip!)}
                copied={copiedField === 'ip'}
              />
            )}
            {visitor.language && (
              <DetailRow
                icon={<Globe className="w-3.5 h-3.5" />}
                label="Language"
                value={visitor.language}
              />
            )}
          </div>
        </section>

        {/* Session & Actions */}
        <section className="p-4 space-y-3">
          <h3 className="text-[11px] font-semibold text-gray-900 tracking-wide">
            Session Tools
          </h3>
          {topic && (
            <div className="rounded-xl bg-[#FAF6FB] border border-[#7B2D8E]/15 px-3 py-2.5">
              <p className="text-[10.5px] font-medium text-[#7B2D8E]">Initial topic</p>
              <p className="text-[12px] text-gray-800 mt-0.5 leading-snug">
                {topic}
              </p>
            </div>
          )}
          {rating != null && (
            <div className="rounded-xl bg-[#FAF6FB] border border-[#7B2D8E]/15 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-medium text-[#5A1D6A]">
                  Customer feedback
                </span>
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7B2D8E] tabular-nums">
                  <Star className="w-3.5 h-3.5 fill-[#7B2D8E] text-[#7B2D8E]" />
                  {rating}/5
                </span>
              </div>
              {ratingComment && (
                <p className="text-[11.5px] text-gray-700 mt-1 italic">
                  &ldquo;{ratingComment}&rdquo;
                </p>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={onDownloadTranscript}
            className="w-full flex items-center justify-between gap-2 rounded-xl border border-gray-200 hover:border-[#7B2D8E]/40 hover:bg-[#FAF6FB] px-3 py-2.5 text-[12.5px] font-medium text-gray-800 hover:text-[#5A1D6A] transition-colors cursor-pointer"
          >
            <span className="inline-flex items-center gap-2">
              <Download className="w-4 h-4 text-[#7B2D8E]" />
              Download chat transcript
            </span>
            <span className="text-[11px] text-gray-400">.txt</span>
          </button>
        </section>

        {/* Account Snapshot (Members vs Guest notice) */}
        <section className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-semibold text-gray-900 tracking-wide">
              Account History
            </h3>
            {!effectiveGuest && data?.wallet?.formatted && (
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7B2D8E] tabular-nums">
                <Wallet className="w-3.5 h-3.5" />
                {data.wallet.formatted}
              </span>
            )}
          </div>

          {loading && !data ? (
            <div className="py-5 text-center text-[12px] text-gray-400">
              <Loader2 className="w-4 h-4 mx-auto animate-spin text-[#7B2D8E] mb-1.5" />
              Loading account records…
            </div>
          ) : effectiveGuest ? (
            <div className="rounded-xl bg-[#FAF6FB] border border-[#7B2D8E]/15 px-3.5 py-3 text-[12px] text-gray-600 leading-relaxed flex items-start gap-2.5">
              <UserRound className="w-4 h-4 text-[#7B2D8E] shrink-0 mt-0.5" />
              <p>
                This visitor is chatting anonymously via the pre-chat form. Use the
                location, browser, and contact details above to assist or follow up.
              </p>
            </div>
          ) : data ? (
            <>
              {/* Bookings */}
              <div>
                <p className="text-[11px] font-medium text-gray-500 mb-1.5">
                  Recent bookings ({data.bookings.length})
                </p>
                {data.bookings.length === 0 ? (
                  <p className="text-[11.5px] text-gray-400 py-1">
                    No bookings on file.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {data.bookings.map((b) => (
                      <div
                        key={b.id}
                        className="py-2 flex items-center justify-between gap-2 text-[11.5px]"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/booking/${encodeURIComponent(b.booking_reference)}`}
                            className="font-medium text-[#7B2D8E] hover:underline truncate block"
                          >
                            {b.booking_reference}
                          </Link>
                          <p className="text-[10.5px] text-gray-400 truncate">
                            {b.location_name} ·{' '}
                            {new Date(b.appointment_date).toLocaleDateString('en-NG', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 block">
                            {b.status}
                          </span>
                          <Link
                            href={`/booking/${encodeURIComponent(b.booking_reference)}`}
                            className="text-[10.5px] font-medium text-[#7B2D8E] hover:underline"
                          >
                            Receipt
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Transactions */}
              <div>
                <p className="text-[11px] font-medium text-gray-500 mb-1.5">
                  Recent transactions ({data.transactions.length})
                </p>
                {data.transactions.length === 0 ? (
                  <p className="text-[11.5px] text-gray-400 py-1">
                    No transactions on file.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {data.transactions.slice(0, 5).map((tx) => {
                      const receiptHref = getReceiptHref({
                        reference: tx.reference,
                        bookingReference: tx.metadata?.booking_reference,
                        metadataType: tx.metadata?.type,
                      })
                      const failed =
                        tx.status === 'failed' ||
                        tx.status === 'declined' ||
                        tx.status === 'cancelled'
                      return (
                        <div
                          key={tx.id}
                          className="py-2 flex items-center justify-between gap-2 text-[11.5px]"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">
                              {tx.description || tx.type}
                            </p>
                            <div className="flex items-center gap-2 text-[10.5px] text-gray-400">
                              <span>
                                {tx.payment_method || tx.type} ·{' '}
                                {new Date(tx.created_at).toLocaleDateString('en-NG', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                              {receiptHref && (
                                <Link
                                  href={receiptHref}
                                  className="inline-flex items-center gap-0.5 font-medium text-[#7B2D8E] hover:underline"
                                >
                                  <Receipt className="w-2.5 h-2.5" />
                                  Receipt
                                </Link>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0 tabular-nums">
                            <p
                              className={cn(
                                'font-semibold',
                                failed ? 'text-[#C63D3D]' : 'text-gray-900',
                              )}
                            >
                              ₦{Math.round(Number(tx.amount)).toLocaleString()}
                            </p>
                            <p
                              className={cn(
                                'text-[10px] font-medium capitalize',
                                failed
                                  ? 'text-[#C63D3D]'
                                  : tx.status === 'success' || tx.status === 'completed'
                                    ? 'text-[#7B2D8E]'
                                    : 'text-gray-500',
                              )}
                            >
                              {tx.status}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Support tickets */}
              {data.tickets.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-gray-500 mb-1.5">
                    Support tickets ({data.tickets.length})
                  </p>
                  <div className="divide-y divide-gray-100">
                    {data.tickets.map((t) => {
                      const sMeta = getTicketStatusMeta(t.status)
                      return (
                        <div
                          key={t.ticket_id}
                          className="py-2 flex items-center justify-between gap-2 text-[11.5px]"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">
                              {t.subject}
                            </p>
                            <p className="text-[10.5px] text-gray-400">
                              {t.category} · {t.ticket_id}
                            </p>
                          </div>
                          <span className="shrink-0 text-[10.5px] font-medium text-[#5A1D6A]">
                            {sMeta.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </section>
      </div>
    </aside>
  )
}

function DetailRow({
  icon,
  label,
  value,
  mono = false,
  muted = false,
  onCopy,
  copied = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
  muted?: boolean
  onCopy?: () => void
  copied?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5 text-[12px]">
      <span className="mt-0.5 text-[#7B2D8E] shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] text-gray-400 leading-none">{label}</p>
        <div className="flex items-center justify-between gap-1.5 mt-1">
          <p
            className={cn(
              'text-[12px] truncate',
              mono && 'font-mono tabular-nums',
              muted ? 'text-gray-400' : 'font-medium text-gray-900',
            )}
            title={value}
          >
            {value}
          </p>
          {onCopy && !muted && (
            <button
              type="button"
              onClick={onCopy}
              aria-label={`Copy ${label}`}
              className="p-1 rounded-md text-gray-400 hover:text-[#7B2D8E] hover:bg-[#FAF6FB] transition-colors shrink-0 cursor-pointer"
            >
              {copied ? (
                <Check className="w-3 h-3 text-[#7B2D8E]" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
