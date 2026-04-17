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
  Calendar, Clock,
} from 'lucide-react'

interface GiftCardRequest {
  id: number
  user_id: string | null
  amount: number
  design: string
  design_name: string
  occasion: string
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
  created_at: string
}

const STATUSES = ['pending', 'processing', 'approved', 'rejected', 'completed']

export default function GiftCardDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [req, setReq] = useState<GiftCardRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
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
    try {
      const res = await fetch('/api/admin/gift-cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: req.id, action: 'update_status', value: status }),
      })
      if (res.ok) setReq({ ...req, status })
    } finally {
      setUpdating(false)
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

  return (
    <div className="space-y-4 max-w-3xl">
      <Link
        href="/admin/gift-cards"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#7B2D8E]"
      >
        <ArrowLeft className="w-4 h-4" /> Back to gift cards
      </Link>

      <Card>
        <CardContent className="p-5 sm:p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500">Gift card request</p>
              <h1 className="text-lg font-semibold text-gray-900">#{req.id}</h1>
            </div>
            <Badge variant="outline" className="bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20 capitalize">
              {req.status}
            </Badge>
          </div>

          {/* Card preview */}
          <div className="bg-[#7B2D8E] rounded-xl p-5 sm:p-6 text-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium opacity-80">Dermaspace Gift Card</span>
              <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                {req.occasion}
              </Badge>
            </div>
            <p className="text-3xl font-bold">N{req.amount.toLocaleString()}</p>
            <p className="text-sm opacity-80 mt-2">For: {req.recipient_name}</p>
            <p className="text-xs opacity-60">From: {req.sender_name}</p>
          </div>

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

          {/* Delivery */}
          <div className="space-y-2">
            <h2 className="font-medium text-gray-900 text-sm">Delivery</h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="capitalize">{req.delivery_method}</span>
              </div>
              {req.delivery_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{new Date(req.delivery_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

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
