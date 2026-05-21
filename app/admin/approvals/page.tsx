'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface ApprovalRequest {
  id: string
  action_type: string
  target_user_id: string
  payload: Record<string, unknown>
  status: string
  requested_by: string
  requested_reason?: string
  reviewed_by?: string
  reviewed_at?: string
  review_note?: string
  created_at: string
  updated_at: string
  requester_name: string
  requester_email: string
  target_name: string
  target_email: string
}

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending')

  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadRequests()
  }, [status])

  const loadRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/admin/approvals?status=${status}`)
      if (!res.ok) throw new Error('Failed to load requests')
      const data = await res.json()
      setRequests(data.requests || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading requests')
    } finally {
      setLoading(false)
    }
  }

  const openReview = (id: string, action: 'approved' | 'rejected') => {
    setReviewId(id)
    setReviewAction(action)
    setReviewNote('')
    setReviewOpen(true)
  }

  const submitReview = async () => {
    if (!reviewId || !reviewAction) return

    try {
      setSubmitting(true)
      const res = await fetch(`/api/admin/approvals/${reviewId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: reviewAction,
          note: reviewNote.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to submit decision')
      }

      setReviewOpen(false)
      await loadRequests()
    } catch (err) {
      alert(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSubmitting(false)
    }
  }

  const getActionLabel = (req: ApprovalRequest) => {
    const targetName = req.target_name || req.target_email || 'unknown'
    if (req.action_type === 'remove_staff') {
      return `Remove ${targetName} from staff`
    }
    if (req.action_type === 'delete_user') {
      return `Delete user account (${targetName})`
    }
    return req.action_type
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pending approvals</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and approve/reject staff requests
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              'px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors',
              status === s
                ? 'border-[#7B2D8E] text-[#7B2D8E]'
                : 'border-transparent text-gray-600 hover:text-gray-900',
            )}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-medium text-red-900">{error}</p>
              <button
                onClick={loadRequests}
                className="mt-2 text-sm text-red-700 underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      ) : !requests.length ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
          <p className="text-sm text-gray-600">
            {status === 'pending'
              ? 'No pending approval requests'
              : `No ${status} requests`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    <h3 className="font-semibold text-gray-900 truncate">
                      {getActionLabel(req)}
                    </h3>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shrink-0',
                        status === 'pending'
                          ? 'bg-amber-50 text-amber-700'
                          : status === 'approved'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700',
                      )}
                    >
                      {status === 'pending' && <Clock className="h-3 w-3" />}
                      {status === 'approved' && <CheckCircle className="h-3 w-3" />}
                      {status === 'rejected' && <XCircle className="h-3 w-3" />}
                      {status}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    <p>
                      Requested by{' '}
                      <span className="font-medium text-gray-700">
                        {req.requester_name}
                      </span>{' '}
                      ({req.requester_email})
                    </p>
                    <p>
                      {new Date(req.created_at).toLocaleDateString('en-NG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {req.requested_reason && (
                      <p className="text-gray-600 italic">
                        Reason: {req.requested_reason}
                      </p>
                    )}
                    {req.review_note && (
                      <p className="text-gray-600 italic">
                        Admin note: {req.review_note}
                      </p>
                    )}
                  </div>
                </div>

                {status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => openReview(req.id, 'rejected')}
                      disabled={submitting}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-green-600 hover:bg-green-700"
                      onClick={() => openReview(req.id, 'approved')}
                      disabled={submitting}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approved' ? 'Approve request' : 'Reject request'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approved'
                ? 'This will execute the requested action.'
                : 'The requester will be notified of your decision.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea
                id="note"
                placeholder="Add a note for the requester..."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={submitReview}
              disabled={submitting}
              className={
                reviewAction === 'approved'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {reviewAction === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
