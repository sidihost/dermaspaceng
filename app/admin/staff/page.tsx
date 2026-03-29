'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  UserCog, Mail, Plus, X, Copy, Check, 
  MessageSquare, Calendar, Gift, Send, Clock, Trash2
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
  invited_by_name: string
  invited_by_last: string
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'staff' | 'admin'>('staff')
  const [inviting, setInviting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/admin/staff')
      if (res.ok) {
        const data = await res.json()
        setStaff(data.staff)
        setInvitations(data.invitations)
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = await res.json()
      if (res.ok) {
        setInviteUrl(data.inviteUrl)
        fetchStaff()
      } else {
        alert(data.error || 'Failed to send invitation')
      }
    } catch (error) {
      console.error('Invite error:', error)
      alert('Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId }),
      })
      if (res.ok) {
        fetchStaff()
      }
    } catch (error) {
      console.error('Delete invitation error:', error)
    }
  }

  const closeModal = () => {
    setShowInviteModal(false)
    setInviteEmail('')
    setInviteRole('staff')
    setInviteUrl('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-[#7B2D8E] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage staff members and send invitations</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E] text-white font-medium rounded-lg hover:bg-[#5A1D6A] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Invite Staff
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-100">
                <UserCog className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{staff.filter(s => s.role === 'admin').length}</p>
                <p className="text-sm text-gray-500">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-100">
                <UserCog className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{staff.filter(s => s.role === 'staff').length}</p>
                <p className="text-sm text-gray-500">Staff Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-orange-100">
                <Mail className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{invitations.length}</p>
                <p className="text-sm text-gray-500">Pending Invites</p>
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
            </div>
          ) : (
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
                        <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-[#7B2D8E]">
                            {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {member.first_name} {member.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={member.role === 'admin' 
                          ? 'bg-purple-100 text-purple-700 border-purple-200'
                          : 'bg-blue-100 text-blue-700 border-blue-200'
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
                        className={member.is_active !== false 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-red-50 text-red-700 border-red-200'
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Invited By</TableHead>
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
                        className={invite.role === 'admin' 
                          ? 'bg-purple-100 text-purple-700 border-purple-200'
                          : 'bg-blue-100 text-blue-700 border-blue-200'
                        }
                      >
                        {invite.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {invite.invited_by_name} {invite.invited_by_last}
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
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-500"
                        title="Cancel invitation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Invite Staff Member</h3>
              <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {!inviteUrl ? (
              <form onSubmit={handleInvite} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    placeholder="staff@example.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'staff' | 'admin')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  >
                    <option value="staff">Staff (Limited access)</option>
                    <option value="admin">Admin (Full access)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Staff can view and respond to requests. Admins have full control.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="flex-1 px-4 py-2 bg-[#7B2D8E] text-white rounded-lg hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {inviting ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send Invite
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-gray-900 font-medium">Invitation Created!</p>
                  <p className="text-sm text-gray-500 mt-1">Share this link with the invitee:</p>
                </div>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={inviteUrl}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-gray-600 outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center">This link expires in 7 days</p>
                <button
                  onClick={closeModal}
                  className="w-full px-4 py-2 bg-[#7B2D8E] text-white rounded-lg hover:bg-[#5A1D6A] transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
