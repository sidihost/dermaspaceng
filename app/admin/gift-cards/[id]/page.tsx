'use client'

/**
 * Admin gift-card request detail page.
 *
 * Full page replacing the old centered modal. Admins can change
 * status here via the existing PUT on /api/admin/gift-cards.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Loader2, AlertCircle, User, Mail, Phone,
  Calendar, Clock, Palette, Type, Send, CheckCircle2,
} from 'lucide-react'
import { getOccasionBadgeIcon } from '@/components/gift-cards/gift-card-preview'
import { GiftCardPrintStudio } from '@/components/gift-cards/gift-card-print-studio'
import {
  findGiftCardDesignById,
  findGiftCardFontById,
  getGiftCardOccasionMeta,
} from '@/lib/gift-card-templates'
import { formatGiftCardSerial } from '@/lib/gift-card-code-helpers'
import { GiftCardVerifyDialog } from '@/components/gift-cards/gift-card-verify-dialog'

interface GiftCardRequest {
  id: number
  user_id: string | null
  amount: number
  design: string
  design_name: string
  occasion: string
  font?: string | null
  font_name?: string | null
  recipient_name: string
  recipient_email: string
  recipient_phone: string
  sender_name: string
  sender_email: string
  personal_message: string
  delivery_method: string
  delivery_date: string
  status: string
  assigned_to: string | null
  assigned_first_name: string | null
  assigned_last_name: string | null
  notes: string | null
  payment_reference?: string | null
  payment_method?: string | null
  payment_status?: string | null
  invoice_number?: string | null
  recipient_notified_at?: string | null
  verification_code?: string | null
  created_at: string
}

const STATUSES = ['pending', 'processing', 'approved', 'rejected', 'completed']

export default function GiftCardDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [req, setReq] = useState<GiftCardRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/gift-cards/${id}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setReq(data.request)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const changeStatus = async (status: string) => {
    if (!req) return
    setUpdating(true)
    setActionMessage(null)
    try {
      const res = await fetch('/api/admin/gift-cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: req.id, action: 'update_status', value: status }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setReq(data.request ?? { ...req, status })
        setActionMessage({
          type: 'success',
          text: data.recipientEmailSent
            ? `Status updated to ${status} and gift card sent to ${req.recipient_email}.`
            : `Status updated to ${status}.`,
        })
      } else {
        setActionMessage({
          type: 'error',
          text: data.error || 'Could not update status.',
        })
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Network error while updating status.' })
    } finally {
      setUpdating(false)
    }
  }

  const sendToRecipient = async () => {
    if (!req || !req.recipient_email) return
    setSendingEmail(true)
    setActionMessage(null)
    try {
      const res = await fetch('/api/admin/gift-cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: req.id, action: 'send_to_recipient' }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        if (data.request) setReq(data.request)
        setActionMessage({
          type: 'success',
          text: `Gift card email delivered to ${req.recipient_email}.`,
        })
      } else {
        setActionMessage({
          type: 'error',
          text: data.error || 'Could not send gift card to recipient.',
        })
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Network error while sending email.' })
    } finally {
      setSendingEmail(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#7B2D8E]" />
      </div>
    )
  }

  if (error || !req) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5 text-[#7B2D8E]" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Unable to load request</h2>
            <p className="text-sm text-gray-500 mt-1">{error || 'Not found'}</p>
          </div>
          <Link
            href="/admin/gift-cards"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#7B2D8E] text-white text-sm font-medium hover:bg-[#5A1D6A]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to gift cards
          </Link>
        </CardContent>
      </Card>
    )
  }

  const chosenDesign = findGiftCardDesignById(req.design || req.design_name)
  const chosenFont = findGiftCardFontById(req.font)
  const occasionMeta = getGiftCardOccasionMeta(req.occasion)
  const OccasionIcon = getOccasionBadgeIcon(occasionMeta.id)

  const verificationCode = req.verification_code || formatGiftCardSerial(req.id)

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href="/admin/gift-cards"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#7B2D8E]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to gift cards
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <GiftCardVerifyDialog
            userRole="admin"
            initialCode={verificationCode}
            buttonLabel="Verify This Card"
          />
          <Link
            href={`/admin/gift-cards/verify?code=${encodeURIComponent(verificationCode)}`}
            className="text-xs font-semibold text-[#7B2D8E] hover:underline"
          >
            Open Admin Verifier
          </Link>
        </div>
      </div>

      <Card className="border-gray-200 print:border-0">
        <CardContent className="p-5 sm:p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500">Gift card request</p>
              <div className="flex flex-wrap items-center gap-2.5 mt-0.5">
                <h1 className="text-lg font-semibold text-gray-900">#{req.id}</h1>
                <code className="font-mono text-xs text-[#5A1D6A] bg-[#FAF6FB] border border-[#7B2D8E]/20 px-2 py-0.5 rounded">
                  {verificationCode}
                </code>
              </div>
            </div>
            <Badge variant="outline" className="bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20 capitalize">
              {req.status}
            </Badge>
          </div>

          {/* Commercial Print-Ready Card Studio (Front + Scannable QR Back + PDF Export) */}
          <GiftCardPrintStudio
            id={req.id}
            verificationCode={verificationCode}
            amount={req.amount}
            designId={req.design || chosenDesign.id}
            designName={req.design_name || chosenDesign.name}
            occasion={req.occasion}
            fontId={req.font || chosenFont.id}
            fontName={req.font_name || chosenFont.name}
            recipientName={req.recipient_name}
            senderName={req.sender_name}
            personalMessage={req.personal_message}
            issuedAt={req.created_at}
          />

          {/* Chosen Style breakdown */}
          <div className="grid md:grid-cols-12 gap-5 items-start print:hidden">
            <div className="md:col-span-12 rounded-xl border border-gray-200 bg-[#FBF9FC] p-4 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Chosen card style
              </h2>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 w-5 h-5 rounded-md border border-black/10 flex-shrink-0 overflow-hidden flex"
                  >
                    <span className="w-3/5 h-full" style={{ backgroundColor: chosenDesign.surfaceHex }} />
                    <span className="w-2/5 h-full" style={{ backgroundColor: chosenDesign.accentHex }} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-500 leading-none mb-0.5">Colour &amp; Design</p>
                    <p className="font-semibold text-gray-900 leading-tight">
                      {req.design_name || chosenDesign.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 w-5 h-5 rounded-md bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                    <OccasionIcon className="w-3 h-3" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-500 leading-none mb-0.5">Occasion Theme</p>
                    <p className="font-semibold text-gray-900 leading-tight">
                      {req.occasion || 'Standard'}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{occasionMeta.editionLabel}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 w-5 h-5 rounded-md bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                    <Type className="w-3 h-3" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-500 leading-none mb-0.5">Font Style</p>
                    <p className={`font-semibold text-gray-900 leading-tight ${chosenFont.className}`}>
                      {req.font_name || chosenFont.name} <span className="text-gray-400 font-normal">(Aa)</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 w-5 h-5 rounded-md bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                    <Palette className="w-3 h-3" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-500 leading-none mb-0.5">Palette Hex</p>
                    <p className="font-mono text-xs text-gray-700 leading-tight">
                      {chosenDesign.surfaceHex}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action feedback */}
          {actionMessage && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${
                actionMessage.type === 'success'
                  ? 'border-[#7B2D8E]/25 bg-[#7B2D8E]/5 text-[#4A1558]'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#7B2D8E] flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
          )}

          {/* Status control */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Update status</label>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  disabled={updating || req.status === s}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors capitalize ${
                    req.status === s
                      ? 'border-[#7B2D8E] bg-[#7B2D8E] text-white'
                      : 'border-gray-200 hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* People */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h2 className="font-medium text-gray-900 text-sm">Recipient</h2>
              <Info icon={<User className="w-4 h-4" />} value={req.recipient_name} />
              <Info icon={<Mail className="w-4 h-4" />} value={req.recipient_email || 'N/A'} />
              <Info icon={<Phone className="w-4 h-4" />} value={req.recipient_phone || 'N/A'} />
            </div>
            <div className="space-y-2">
              <h2 className="font-medium text-gray-900 text-sm">Sender</h2>
              <Info icon={<User className="w-4 h-4" />} value={req.sender_name} />
              <Info icon={<Mail className="w-4 h-4" />} value={req.sender_email || 'N/A'} />
            </div>
          </div>

          {/* Delivery & Recipient Dispatch */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-medium text-gray-900 text-sm">Delivery &amp; Recipient Email</h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="capitalize">{req.delivery_method || 'email'}</span>
                  </div>
                  {req.delivery_date && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{new Date(req.delivery_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <span className="text-xs font-medium text-[#7B2D8E]">
                    {req.recipient_notified_at
                      ? `Sent on ${new Date(req.recipient_notified_at).toLocaleString()}`
                      : 'Not sent to recipient yet'}
                  </span>
                </div>
              </div>

              {req.recipient_email && (
                <button
                  type="button"
                  onClick={sendToRecipient}
                  disabled={sendingEmail}
                  className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] transition-colors disabled:opacity-50"
                >
                  {sendingEmail ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {sendingEmail
                    ? 'Sending…'
                    : req.recipient_notified_at
                      ? 'Resend to Recipient'
                      : 'Send to Recipient'}
                </button>
              )}
            </div>
          </div>

          {/* Payment & Invoice */}
          {(req.payment_status || req.payment_method || req.payment_reference || req.invoice_number) && (
            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-medium text-gray-900 text-sm">Payment &amp; Invoice</h2>
                {req.payment_status && (
                  <Badge
                    variant="outline"
                    className={
                      req.payment_status === 'paid'
                        ? 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20 capitalize'
                        : 'bg-amber-50 text-amber-700 border-amber-200 capitalize'
                    }
                  >
                    {req.payment_status}
                  </Badge>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-2 text-xs text-gray-600">
                {req.payment_method && (
                  <p>
                    <span className="text-gray-400">Method:</span>{' '}
                    <span className="font-medium text-gray-800 capitalize">
                      {req.payment_method.replace('_', ' ')}
                    </span>
                  </p>
                )}
                {req.invoice_number && (
                  <p>
                    <span className="text-gray-400">Invoice:</span>{' '}
                    <span className="font-mono font-medium text-gray-800">{req.invoice_number}</span>
                  </p>
                )}
                {req.payment_reference && (
                  <p className="sm:col-span-2 break-all">
                    <span className="text-gray-400">Reference:</span>{' '}
                    <span className="font-mono font-medium text-gray-800">{req.payment_reference}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {req.personal_message && (
            <div>
              <h2 className="font-medium text-gray-900 text-sm mb-2">Personal message</h2>
              <p className="text-sm text-gray-600 italic p-3 bg-gray-50 rounded-lg">
                &quot;{req.personal_message}&quot;
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between text-sm text-gray-500 gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Submitted {new Date(req.created_at).toLocaleString()}</span>
            </div>
            {req.assigned_first_name && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>
                  Assigned to {req.assigned_first_name} {req.assigned_last_name}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Info({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span className="text-gray-400">{icon}</span>
      <span>{value}</span>
    </div>
  )
}
