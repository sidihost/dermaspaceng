'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, Users, Settings, Eye, Pencil, Trash2, Plus, X,
  Check, AlertCircle, Lock, Unlock, UserCog, Calendar, DollarSign,
  MessageSquare, Gift, ClipboardList, Activity, FileText, Mail,
  ChevronRight, Search, Save, RotateCcw
} from 'lucide-react'

interface Staff {
  id: string
  name: string
  email: string
  role: 'admin' | 'staff'
  is_active: boolean
  permissions: string[]
  created_at: string
}

interface Permission {
  id: string
  name: string
  key: string
  description: string
  category: string
  icon: React.ComponentType<{ className?: string }>
}

interface PermissionCategory {
  name: string
  icon: React.ComponentType<{ className?: string }>
  permissions: Permission[]
}

const permissionCategories: PermissionCategory[] = [
  {
    name: 'Bookings',
    icon: Calendar,
    permissions: [
      { id: 'p1', name: 'View Bookings', key: 'bookings.view', description: 'View all bookings and appointments', category: 'Bookings', icon: Eye },
      { id: 'p2', name: 'Create Bookings', key: 'bookings.create', description: 'Create new bookings for clients', category: 'Bookings', icon: Plus },
      { id: 'p3', name: 'Edit Bookings', key: 'bookings.edit', description: 'Modify existing bookings', category: 'Bookings', icon: Pencil },
      { id: 'p4', name: 'Cancel Bookings', key: 'bookings.cancel', description: 'Cancel or delete bookings', category: 'Bookings', icon: Trash2 },
    ]
  },
  {
    name: 'Clients',
    icon: Users,
    permissions: [
      { id: 'p5', name: 'View Clients', key: 'clients.view', description: 'View client profiles and information', category: 'Clients', icon: Eye },
      { id: 'p6', name: 'Edit Clients', key: 'clients.edit', description: 'Update client information', category: 'Clients', icon: Pencil },
      { id: 'p7', name: 'Export Clients', key: 'clients.export', description: 'Export client data', category: 'Clients', icon: FileText },
      { id: 'p8', name: 'Delete Clients', key: 'clients.delete', description: 'Remove client records', category: 'Clients', icon: Trash2 },
    ]
  },
  {
    name: 'Payments',
    icon: DollarSign,
    permissions: [
      { id: 'p9', name: 'View Payments', key: 'payments.view', description: 'View payment history and transactions', category: 'Payments', icon: Eye },
      { id: 'p10', name: 'Process Refunds', key: 'payments.refund', description: 'Issue refunds to clients', category: 'Payments', icon: RotateCcw },
      { id: 'p11', name: 'View Reports', key: 'payments.reports', description: 'Access financial reports', category: 'Payments', icon: FileText },
    ]
  },
  {
    name: 'Complaints',
    icon: MessageSquare,
    permissions: [
      { id: 'p12', name: 'View Complaints', key: 'complaints.view', description: 'View customer complaints', category: 'Complaints', icon: Eye },
      { id: 'p13', name: 'Respond to Complaints', key: 'complaints.respond', description: 'Reply to customer complaints', category: 'Complaints', icon: Mail },
      { id: 'p14', name: 'Resolve Complaints', key: 'complaints.resolve', description: 'Mark complaints as resolved', category: 'Complaints', icon: Check },
    ]
  },
  {
    name: 'Gift Cards',
    icon: Gift,
    permissions: [
      { id: 'p15', name: 'View Gift Cards', key: 'giftcards.view', description: 'View gift card requests', category: 'Gift Cards', icon: Eye },
      { id: 'p16', name: 'Process Gift Cards', key: 'giftcards.process', description: 'Approve or reject gift card requests', category: 'Gift Cards', icon: Check },
    ]
  },
  {
    name: 'Staff',
    icon: UserCog,
    permissions: [
      { id: 'p17', name: 'View Staff', key: 'staff.view', description: 'View staff member profiles', category: 'Staff', icon: Eye },
      { id: 'p18', name: 'Invite Staff', key: 'staff.invite', description: 'Send invitations to new staff', category: 'Staff', icon: Plus },
      { id: 'p19', name: 'Manage Permissions', key: 'staff.permissions', description: 'Modify staff permissions', category: 'Staff', icon: Shield },
    ]
  },
  {
    name: 'Settings',
    icon: Settings,
    permissions: [
      { id: 'p20', name: 'View Settings', key: 'settings.view', description: 'View system settings', category: 'Settings', icon: Eye },
      { id: 'p21', name: 'Modify Settings', key: 'settings.edit', description: 'Change system settings', category: 'Settings', icon: Pencil },
      { id: 'p22', name: 'View Activity Log', key: 'activity.view', description: 'Access activity logs', category: 'Settings', icon: Activity },
    ]
  },
]

const mockStaff: Staff[] = [
  {
    id: '1',
    name: 'Dr. Amina Hassan',
    email: 'amina@dermaspace.ng',
    role: 'admin',
    is_active: true,
    permissions: ['all'],
    created_at: '2025-06-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Dr. Chidi Okafor',
    email: 'chidi@dermaspace.ng',
    role: 'staff',
    is_active: true,
    permissions: ['bookings.view', 'bookings.create', 'bookings.edit', 'clients.view', 'clients.edit', 'complaints.view', 'complaints.respond'],
    created_at: '2025-09-20T14:00:00Z',
  },
  {
    id: '3',
    name: 'Blessing Nweke',
    email: 'blessing@dermaspace.ng',
    role: 'staff',
    is_active: true,
    permissions: ['bookings.view', 'bookings.create', 'clients.view', 'giftcards.view'],
    created_at: '2025-11-10T09:00:00Z',
  },
  {
    id: '4',
    name: 'Tunde Adebayo',
    email: 'tunde@dermaspace.ng',
    role: 'staff',
    is_active: false,
    permissions: ['bookings.view', 'clients.view'],
    created_at: '2025-12-05T11:00:00Z',
  },
]

export default function PermissionsPage() {
  const [staff, setStaff] = useState<Staff[]>(mockStaff)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [search, setSearch] = useState('')
  const [editedPermissions, setEditedPermissions] = useState<string[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<string[]>(permissionCategories.map(c => c.name))

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const selectStaff = (staffMember: Staff) => {
    setSelectedStaff(staffMember)
    setEditedPermissions([...staffMember.permissions])
    setHasChanges(false)
  }

  const togglePermission = (permKey: string) => {
    if (selectedStaff?.role === 'admin') return // Admins have all permissions
    
    setEditedPermissions(prev => {
      const newPerms = prev.includes(permKey)
        ? prev.filter(p => p !== permKey)
        : [...prev, permKey]
      
      setHasChanges(JSON.stringify(newPerms.sort()) !== JSON.stringify([...selectedStaff!.permissions].sort()))
      return newPerms
    })
  }

  const toggleCategoryPermissions = (category: PermissionCategory) => {
    if (selectedStaff?.role === 'admin') return
    
    const categoryPerms = category.permissions.map(p => p.key)
    const allSelected = categoryPerms.every(p => editedPermissions.includes(p))
    
    setEditedPermissions(prev => {
      let newPerms: string[]
      if (allSelected) {
        newPerms = prev.filter(p => !categoryPerms.includes(p))
      } else {
        newPerms = [...new Set([...prev, ...categoryPerms])]
      }
      setHasChanges(JSON.stringify(newPerms.sort()) !== JSON.stringify([...selectedStaff!.permissions].sort()))
      return newPerms
    })
  }

  const savePermissions = () => {
    if (!selectedStaff) return
    
    setStaff(prev => prev.map(s => 
      s.id === selectedStaff.id 
        ? { ...s, permissions: editedPermissions }
        : s
    ))
    setSelectedStaff({ ...selectedStaff, permissions: editedPermissions })
    setHasChanges(false)
  }

  const resetPermissions = () => {
    if (!selectedStaff) return
    setEditedPermissions([...selectedStaff.permissions])
    setHasChanges(false)
  }

  const hasPermission = (permKey: string) => {
    if (selectedStaff?.role === 'admin' || editedPermissions.includes('all')) return true
    return editedPermissions.includes(permKey)
  }

  const getCategoryPermissionCount = (category: PermissionCategory) => {
    if (selectedStaff?.role === 'admin') return category.permissions.length
    return category.permissions.filter(p => editedPermissions.includes(p.key)).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Permissions</h1>
          <p className="text-sm text-gray-500 mt-1">Manage what each staff member can access and modify</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Staff List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Staff Members</CardTitle>
            <CardDescription>Select a staff member to manage permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
              />
            </div>
            
            <div className="space-y-2">
              {filteredStaff.map((staffMember) => (
                <button
                  key={staffMember.id}
                  onClick={() => selectStaff(staffMember)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    selectedStaff?.id === staffMember.id
                      ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${!staffMember.is_active ? 'opacity-60' : ''}`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-[#7B2D8E]">
                      {staffMember.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{staffMember.name}</p>
                      {staffMember.role === 'admin' && (
                        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200 text-xs">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{staffMember.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!staffMember.is_active && (
                      <Lock className="w-4 h-4 text-gray-400" />
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Permissions Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#7B2D8E]" />
                  {selectedStaff ? `Permissions for ${selectedStaff.name}` : 'Select a staff member'}
                </CardTitle>
                {selectedStaff && (
                  <CardDescription>
                    {selectedStaff.role === 'admin' 
                      ? 'Admins have full access to all features'
                      : `${editedPermissions.length} permissions granted`
                    }
                  </CardDescription>
                )}
              </div>
              {selectedStaff && hasChanges && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetPermissions}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                  <button
                    onClick={savePermissions}
                    className="px-4 py-1.5 text-sm bg-[#7B2D8E] text-white rounded-lg hover:bg-[#5A1D6A] transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedStaff ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500">Select a staff member from the list to manage their permissions</p>
              </div>
            ) : selectedStaff.role === 'admin' ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Administrator Access</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  This user has administrator privileges with full access to all features and settings. 
                  Admin permissions cannot be modified.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {permissionCategories.map((category) => {
                  const isExpanded = expandedCategories.includes(category.name)
                  const permCount = getCategoryPermissionCount(category)
                  const totalPerms = category.permissions.length
                  const allSelected = permCount === totalPerms
                  
                  return (
                    <div key={category.name} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleCategory(category.name)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-[#7B2D8E]/10">
                            <category.icon className="w-5 h-5 text-[#7B2D8E]" />
                          </div>
                          <div className="text-left">
                            <h3 className="font-medium text-gray-900">{category.name}</h3>
                            <p className="text-sm text-gray-500">
                              {permCount} of {totalPerms} permissions enabled
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleCategoryPermissions(category)
                            }}
                            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                              allSelected
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {allSelected ? 'Enabled All' : 'Enable All'}
                          </button>
                          <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="divide-y divide-gray-100">
                          {category.permissions.map((permission) => (
                            <label
                              key={permission.id}
                              className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded ${hasPermission(permission.key) ? 'bg-green-100' : 'bg-gray-100'}`}>
                                  <permission.icon className={`w-4 h-4 ${hasPermission(permission.key) ? 'text-green-600' : 'text-gray-400'}`} />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">{permission.name}</p>
                                  <p className="text-xs text-gray-500">{permission.description}</p>
                                </div>
                              </div>
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={hasPermission(permission.key)}
                                  onChange={() => togglePermission(permission.key)}
                                  className="sr-only"
                                />
                                <div className={`w-10 h-6 rounded-full transition-colors ${
                                  hasPermission(permission.key) ? 'bg-[#7B2D8E]' : 'bg-gray-300'
                                }`}>
                                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform mt-1 ${
                                    hasPermission(permission.key) ? 'translate-x-5' : 'translate-x-1'
                                  }`} />
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Reference Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permission Levels Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <h4 className="font-medium text-purple-900">Admin</h4>
              </div>
              <p className="text-sm text-purple-700">Full access to all features, settings, and user management</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-blue-900">View Only</h4>
              </div>
              <p className="text-sm text-blue-700">Can view data but cannot create, edit, or delete records</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <Pencil className="w-5 h-5 text-green-600" />
                <h4 className="font-medium text-green-900">Editor</h4>
              </div>
              <p className="text-sm text-green-700">Can view and modify existing records but not delete</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 border border-orange-100">
              <div className="flex items-center gap-2 mb-2">
                <Trash2 className="w-5 h-5 text-orange-600" />
                <h4 className="font-medium text-orange-900">Full Access</h4>
              </div>
              <p className="text-sm text-orange-700">Can view, create, edit, and delete records in a category</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
