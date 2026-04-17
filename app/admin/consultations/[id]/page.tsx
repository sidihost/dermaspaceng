'use client'

/**
 * Admin consultation detail page.
 *
 * Full page replacing the old centered modal. Supports status
 * changes (via PUT /api/admin/consultations) and staff replies
 * (via /api/admin/reply) inline, the same as the complaints page.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Loader2, AlertCircle, User, Mail, Phone, MapPin,
  Clock, Send,
} from 'lucide-react'

interface Consultation {
  id: number
  name: string
  email: string
  phone: string
  location: string
  concerns: string[] | null
  message: string | null
  status: string
  assigned_to: string | null
  assigned_first_name: string | null
  assigned_last_name: string | null
  admin_notes: string | null
  scheduled_at: string | null
  created_at: string
}

interface Reply {
  id: string
  message: string
  is_internal: boolean
  created_at: string
  staff_first_name: string
  staff_last_name: string
}

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled']

export default function ConsultationDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [sending, setSending] = useState(false)
  const [replyMessage, setReplyMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadReplies = useCallback(async (consId: string | number) => {
    try {
      const res = await fetch(`/api/admin/reply?requestType=consultation&requestId=${consId}`)
      if (res.ok) {
        const data = await res.json()
        setReplies(data.replies || [])
      }
    } catch {
      /* non-fatal */
    }
  }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/consultations/${id}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load')
        if (!cancelled) {
          setConsultation(data.consultation)
          await loadReplies(data.consultation.id)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id, loadReplies])

  const changeStatus = async (status: string) => {
    if (!consultation) return
    setUpdating(true)
    try {
      const res = await fetch('/api/admin/consultations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId: consultation.id, action: 'update_status', value: status }),
      })
      if (res.ok) setConsultation({ ...consultation, status })
    } finally {
      setUpdating(false)
    }
  }

  const sendReply = async () => {
    if (!consultation || !replyMessage.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'consultation',
          requestId: consultation.id,
          userEmail: consultation.email,
          message: replyMessage,
          isInternal: false,
        }),
      })
      if (res.ok) {
        setReplyMessage('')
        await loadReplies(consultation.id)
      }
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#7B2D8E]" />
      </div>
    )
  }

  if (error || !consultation) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5 text-[#7B2D8E]" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Unable to load consultation</h2>
            <p className="text-sm text-gray-500 mt-1">{error || 'Not found'}</p>
          </div>
          <Link
            href="/admin/consultations"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#7B2D8E] text-white text-sm font-medium hover:bg-[#5A1D6A]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to consultations
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Link
        href="/admin/consultations"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#7B2D8E]"
      >
        <ArrowLeft className="w-4 h-4" /> Back to consultations
      </Link>

      <Card>
        <CardContent className="p-5 sm:p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500">Consultation</p>
              <h1 className="text-lg font-semibold text-gray-900">#{consultation.id}</h1>
            </div>
            <Badge variant="outline" className="bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20 capitalize">
              {consultation.status}
            </Badge>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <Row icon={<User className="w-4 h-4" />} value={consultation.name} bold />
              <Row icon={<Mail className="w-4 h-4" />} value={consultation.email} />
              <Row icon={<Phone className="w-4 h-4" />} value={consultation.phone} />
            </div>
            <div className="space-y-2">
              <Row icon={<MapPin className="w-4 h-4" />} value={consultation.location} />
              <Row icon={<Clock className="w-4 h-4" />} value={new Date(consultation.created_at).toLocaleString()} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  disabled={updating || consultation.status === s}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors capitalize ${
                    consultation.status === s
                      ? 'border-[#7B2D8E] bg-[#7B2D8E] text-white'
                      : 'border-gray-200 hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {consultation.concerns && consultation.concerns.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-700 mb-2">Concerns</h2>
              <div className="flex flex-wrap gap-2">
                {consultation.concerns.map((concern, i) => (
                  <Badge key={i} variant="outline" className="bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20">
                    {concern}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {consultation.message && (
            <div>
              <h2 className="text-sm font-medium text-gray-700 mb-2">Additional notes</h2>
              <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                {consultation.message}
              </p>
            </div>
          )}

          {replies.length > 0 && (
            <div>
              <h2 className="font-medium text-gray-900 mb-3">Conversation</h2>
              <div className="space-y-3">
                {replies.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-lg bg-[#7B2D8E]/5 border border-[#7B2D8E]/20"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {r.staff_first_name} {r.staff_last_name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reply composer */}
          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">Reply</label>
            <div className="flex gap-2">
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your reply…"
                rows={2}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] resize-none"
              />
              <button
                onClick={sendReply}
                disabled={sending || !replyMessage.trim()}
                className="h-9 px-4 text-sm font-medium bg-[#7B2D8E] text-white rounded-lg hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
              >
                {sending ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ icon, value, bold }: { icon: React.ReactNode; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-gray-600">
      <span className="text-gray-400">{icon}</span>
      <span className={bold ? 'font-medium text-gray-700' : ''}>{value}</span>
    </div>
  )
}
