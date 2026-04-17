'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  Search, Users, UserCheck, UserX, ChevronLeft, ChevronRight,
  MoreVertical, Shield, ShieldOff, Mail, Phone
} from 'lucide-react'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  email_verified: boolean
  role: string
  is_active: boolean
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        role: roleFilter,
      })
      const res = await fetch(`/api/admin/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, search, roleFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleAction = async (userId: string, action: string, value: unknown) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, value }),
      })
      if (res.ok) {
        fetchUsers()
        setSelectedUser(null)
      }
    } catch (error) {
      console.error('Action failed:', error)
    }
  }

  // Keep role badges on-brand: admin uses filled purple, staff uses a soft
  // brand tint, user stays neutral. This avoids the off-brand blues/purples
  // we had before that drifted away from the Dermaspace palette.
  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      admin: 'bg-[#7B2D8E] text-white border-[#7B2D8E]',
      staff: 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20',
      user: 'bg-gray-100 text-gray-700 border-gray-200',
    }
    return styles[role] || styles.user
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {/* Page titles use 20px/semibold — Google-admin scale, calmer
              than the heavier 24px/bold we had across the console. */}
          <h1 className="text-xl font-semibold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all registered users</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{pagination.total} total users</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPagination(p => ({ ...p, page: 1 }))
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
                setPagination(p => ({ ...p, page: 1 }))
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
            >
              <option value="">All Roles</option>
              <option value="user">Users</option>
              <option value="staff">Staff</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-3 border-[#7B2D8E] border-t-transparent rounded-full" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer hover:bg-[#7B2D8E]/5 transition-colors"
                    // Navigate to the admin user-detail view on row click. The
                    // actions menu in the last cell stops propagation so it
                    // doesn't double-fire this handler.
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-[#7B2D8E]">
                            {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </p>
                          {/* Brand purple for "verified" replaces the stray
                              green-500 so the list stays strictly on-palette. */}
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            {user.email_verified ? (
                              <UserCheck className="w-3 h-3 text-[#7B2D8E]" />
                            ) : (
                              <UserX className="w-3 h-3 text-gray-400" />
                            )}
                            <span>{user.email_verified ? 'Verified' : 'Unverified'}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Mail className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[180px]">{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getRoleBadge(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {/* Brand purple tint for Active, neutral gray for
                          Suspended. No emerald — the admin wanted the whole
                          list to read as Dermaspace, not a generic CRM. */}
                      <Badge
                        variant="outline"
                        className={user.is_active !== false
                          ? 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                        }
                      >
                        {user.is_active !== false ? 'Active' : 'Suspended'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    {/*
                      The actions cell stops row-click propagation so clicking
                      the menu doesn't also navigate to the user detail page,
                      and brings the menu items back to the brand palette.
                    */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          aria-label="Open user actions"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                        {selectedUser === user.id && (
                          <div className="absolute right-0 top-8 z-10 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                            {user.is_active !== false ? (
                              <button
                                onClick={() => handleAction(user.id, 'toggle_active', false)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <ShieldOff className="w-4 h-4 text-gray-500" />
                                Suspend user
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAction(user.id, 'toggle_active', true)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#7B2D8E] hover:bg-[#7B2D8E]/5"
                              >
                                <Shield className="w-4 h-4" />
                                Activate user
                              </button>
                            )}
                            {user.role === 'user' && (
                              <button
                                onClick={() => handleAction(user.id, 'change_role', 'staff')}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#7B2D8E] hover:bg-[#7B2D8E]/5"
                              >
                                <Shield className="w-4 h-4" />
                                Make staff
                              </button>
                            )}
                            {user.role === 'staff' && (
                              <>
                                <button
                                  onClick={() => handleAction(user.id, 'change_role', 'admin')}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#7B2D8E] hover:bg-[#7B2D8E]/5"
                                >
                                  <Shield className="w-4 h-4" />
                                  Make admin
                                </button>
                                <button
                                  onClick={() => handleAction(user.id, 'change_role', 'user')}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <ShieldOff className="w-4 h-4 text-gray-500" />
                                  Remove staff
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
