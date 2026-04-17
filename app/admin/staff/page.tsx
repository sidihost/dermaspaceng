'use client'

/**
 * Admin → Staff list.
 *
 * Previously this page had both an inline invite modal and a dedicated
 * /admin/staff/invite page, which drifted apart and caused the "invite staff
 * doesn't work" reports. The admin area is modal-free by design, so this
 * page now just links to the dedicated invite page for a single, predictable
 * flow.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  UserCog,
  Mail,
  Plus,
  MessageSquare,
  Calendar,
  Gift,
  Send,
  Clock,
  Trash2,
} from 'lucide-react'

interface Staff {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  role: string
  is_active: boolean
  created_at: string
  replies_count: number
  complaints_assigned: number
  consultations_assigned: number
  gift_cards_assigned: number
}

interface Invitation {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string
  invited_by_name: string | null
  invited_by_last: string | null
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/admin/staff')
      if (res.ok) {
        const data = await res.json()
        setStaff(data.staff ?? [])
        setInvitations(data.invitations ?? [])
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('Cancel this invitation?')) return
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId }),
      })
      if (res.ok) fetchStaff()
    } catch (error) {
      console.error('Delete invitation error:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-[#7B2D8E] border-t-transparent rounded-full" />
      </div>
    )
  }

  const adminCount = staff.filter((s) => s.role === 'admin').length
  const staffCount = staff.filter((s) => s.role === 'staff').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Staff</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage staff members and send invitations
          </p>
        </div>
        <Link
          href="/admin/staff/invite"
          className="inline-flex items-center gap-2 h-9 px-4 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#5A1D6A] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Invite Staff
        </Link>
      </div>

      {/* Stats — neutral chip backgrounds with brand-purple glyphs, so the
          row reads as one cohesive admin surface instead of three random
          pastel tiles. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3.5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-gray-100">
                <UserCog className="w-4 h-4 text-[#7B2D8E]" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 leading-tight">{adminCount}</p>
                <p className="text-xs text-gray-500">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3.5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-gray-100">
                <UserCog className="w-4 h-4 text-[#7B2D8E]" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 leading-tight">{staffCount}</p>
                <p className="text-xs text-gray-500">Staff members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3.5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-gray-100">
                <Mail className="w-4 h-4 text-[#7B2D8E]" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 leading-tight">
                  {invitations.length}
                </p>
                <p className="text-xs text-gray-500">Pending invites</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
          <CardDescription>Staff members with dashboard access</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {staff.length === 0 ? (
            <div className="text-center py-12">
              <UserCog className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No staff members yet</p>
              <Link
                href="/admin/staff/invite"
                className="inline-flex items-center gap-2 mt-4 h-9 px-4 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#5A1D6A] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Invite your first staff
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-[#7B2D8E]">
                              {member.first_name.charAt(0)}
                              {member.last_name.charAt(0)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="text-sm text-gray-500 truncate">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            member.role === 'admin'
                              ? 'bg-[#7B2D8E] text-white border-[#7B2D8E]'
                              : 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20'
                          }
                        >
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1" title="Replies sent">
                            <Send className="w-3.5 h-3.5" />
                            {member.replies_count}
                          </span>
                          <span className="flex items-center gap-1" title="Complaints assigned">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {member.complaints_assigned}
                          </span>
                          <span className="flex items-center gap-1" title="Consultations assigned">
                            <Calendar className="w-3.5 h-3.5" />
                            {member.consultations_assigned}
                          </span>
                          <span className="flex items-center gap-1" title="Gift cards assigned">
                            <Gift className="w-3.5 h-3.5" />
                            {member.gift_cards_assigned}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            member.is_active !== false
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }
                        >
                          {member.is_active !== false ? 'Active' : 'Suspended'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {new Date(member.created_at).toLocaleDateString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Invitations</CardTitle>
            <CardDescription>Invitations waiting to be accepted</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Invited by</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">{invite.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            invite.role === 'admin'
                              ? 'bg-[#7B2D8E] text-white border-[#7B2D8E]'
                              : 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20'
                          }
                        >
                          {invite.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {invite.invited_by_name
                            ? `${invite.invited_by_name} ${invite.invited_by_last ?? ''}`.trim()
                            : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(invite.expires_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleDeleteInvitation(invite.id)}
                          className="p-1.5 hover:bg-rose-50 rounded-lg transition-colors text-rose-500"
                          title="Cancel invitation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
