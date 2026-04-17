'use client'

/**
 * Admin "invite staff" page.
 *
 * Replaces the previous invite modal with a dedicated page so the
 * admin area is 100% modal-free.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Mail, Check, Copy } from 'lucide-react'

export default function InviteStaffPage() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'staff' | 'admin'>('staff')
  const [inviting, setInviting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setError('')
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      const data = await res.json()
      if (res.ok) {
        setInviteUrl(data.inviteUrl)
      } else {
        setError(data.error || 'Failed to create invite')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setInviting(false)
    }
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4 max-w-lg">
      <Link
        href="/admin/staff"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#7B2D8E]"
      >
        <ArrowLeft className="w-4 h-4" /> Back to staff
      </Link>

      <Card>
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Invite staff member</h1>
            <p className="text-sm text-gray-500 mt-1">
              Send a signed invite link. It expires in 7 days.
            </p>
          </div>

          {!inviteUrl ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="staff@example.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'staff' | 'admin')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                >
                  <option value="staff">Staff (limited access)</option>
                  <option value="admin">Admin (full access)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Staff can view and respond to requests. Admins have full control.
                </p>
              </div>

              {error && (
                <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Link
                  href="/admin/staff"
                  className="flex-1 h-9 px-4 text-sm font-medium border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 h-9 px-4 text-sm font-medium bg-[#7B2D8E] text-white rounded-lg hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {inviting ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send invite
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-[#7B2D8E]" />
                </div>
                <p className="text-gray-900 font-medium">Invitation created</p>
                <p className="text-sm text-gray-500 mt-1">Share this link with the invitee</p>
              </div>

              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-gray-600 outline-none"
                />
                <button
                  onClick={copyLink}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  aria-label="Copy invite link"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-[#7B2D8E]" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center">This link expires in 7 days</p>

              <Link
                href="/admin/staff"
                className="w-full h-9 px-4 text-sm font-medium bg-[#7B2D8E] text-white rounded-lg hover:bg-[#5A1D6A] transition-colors flex items-center justify-center"
              >
                Done
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
