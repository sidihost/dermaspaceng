'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  Users, Search, Download, ChevronLeft, ChevronRight, Eye, X,
  Mail, Phone, Calendar, MapPin, DollarSign, Clock, Star,
  FileText, MessageSquare, Plus, Filter, MoreVertical, Send,
  CheckCircle, AlertCircle, UserPlus, History, Sparkles
} from 'lucide-react'

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  location: string
  date_of_birth: string | null
  gender: string | null
  skin_type: string | null
  allergies: string[] | null
  total_bookings: number
  total_spent: number
  last_visit: string | null
  status: 'active' | 'inactive' | 'vip' | 'new'
  notes: string | null
  created_at: string
}

interface ClientNote {
  id: string
  note: string
  created_by: string
  created_at: string
}

interface ClientHistory {
  id: string
  service_name: string
  date: string
  amount: number
  status: 'completed' | 'cancelled' | 'no_show'
  staff_name: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const mockClients: Client[] = [
  {
    id: '1',
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah@email.com',
    phone: '+234 801 234 5678',
    location: 'Lagos, Nigeria',
    date_of_birth: '1992-05-15',
    gender: 'Female',
    skin_type: 'Oily',
    allergies: ['Parabens', 'Fragrance'],
    total_bookings: 12,
    total_spent: 350000,
    last_visit: '2026-03-28',
    status: 'vip',
    notes: 'Prefers morning appointments',
    created_at: '2025-06-15T10:00:00Z',
  },
  {
    id: '2',
    first_name: 'Michael',
    last_name: 'Okonkwo',
    email: 'michael@email.com',
    phone: '+234 802 345 6789',
    location: 'Abuja, Nigeria',
    date_of_birth: '1988-11-22',
    gender: 'Male',
    skin_type: 'Combination',
    allergies: null,
    total_bookings: 5,
    total_spent: 125000,
    last_visit: '2026-03-25',
    status: 'active',
    notes: null,
    created_at: '2025-09-20T14:00:00Z',
  },
  {
    id: '3',
    first_name: 'Fatima',
    last_name: 'Ahmed',
    email: 'fatima@email.com',
    phone: '+234 803 456 7890',
    location: 'Kano, Nigeria',
    date_of_birth: '1995-03-08',
    gender: 'Female',
    skin_type: 'Sensitive',
    allergies: ['Retinol'],
    total_bookings: 8,
    total_spent: 200000,
    last_visit: '2026-03-20',
    status: 'active',
    notes: 'Sensitive skin - use gentle products only',
    created_at: '2025-08-10T09:00:00Z',
  },
  {
    id: '4',
    first_name: 'Grace',
    last_name: 'Adeyemi',
    email: 'grace@email.com',
    phone: '+234 804 567 8901',
    location: 'Lagos, Nigeria',
    date_of_birth: '1990-07-30',
    gender: 'Female',
    skin_type: 'Dry',
    allergies: null,
    total_bookings: 2,
    total_spent: 50000,
    last_visit: '2026-03-15',
    status: 'new',
    notes: null,
    created_at: '2026-03-01T11:00:00Z',
  },
  {
    id: '5',
    first_name: 'David',
    last_name: 'Eze',
    email: 'david@email.com',
    phone: '+234 805 678 9012',
    location: 'Port Harcourt, Nigeria',
    date_of_birth: '1985-12-05',
    gender: 'Male',
    skin_type: 'Normal',
    allergies: null,
    total_bookings: 0,
    total_spent: 0,
    last_visit: null,
    status: 'inactive',
    notes: 'Consultation only - no follow up',
    created_at: '2025-12-10T16:00:00Z',
  },
]

const mockHistory: ClientHistory[] = [
  { id: 'h1', service_name: 'Facial Treatment', date: '2026-03-28', amount: 25000, status: 'completed', staff_name: 'Dr. Amina' },
  { id: 'h2', service_name: 'Acne Treatment', date: '2026-03-15', amount: 35000, status: 'completed', staff_name: 'Dr. Chidi' },
  { id: 'h3', service_name: 'Chemical Peel', date: '2026-02-28', amount: 50000, status: 'completed', staff_name: 'Dr. Amina' },
  { id: 'h4', service_name: 'Consultation', date: '2026-02-10', amount: 10000, status: 'completed', staff_name: 'Dr. Chidi' },
]

const mockNotes: ClientNote[] = [
  { id: 'n1', note: 'Client prefers gentle products due to sensitive skin', created_by: 'Dr. Amina', created_at: '2026-03-20T10:00:00Z' },
  { id: 'n2', note: 'Allergic to parabens - noted in records', created_by: 'Admin', created_at: '2026-03-15T14:00:00Z' },
]

const statusConfig = {
  active: { label: 'Active', color: 'bg-green-100 text-green-700 border-green-200' },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  vip: { label: 'VIP', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  new: { label: 'New', color: 'bg-blue-100 text-blue-700 border-blue-200' },
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(mockClients)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: mockClients.length, totalPages: 1 })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'notes'>('details')
  const [history, setHistory] = useState<ClientHistory[]>(mockHistory)
  const [notes, setNotes] = useState<ClientNote[]>(mockNotes)
  const [newNote, setNewNote] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFields, setExportFields] = useState<string[]>(['name', 'email', 'phone', 'total_bookings', 'total_spent'])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount)
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch = !search || 
      `${client.first_name} ${client.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      client.email.toLowerCase().includes(search.toLowerCase()) ||
      client.phone.includes(search)
    const matchesStatus = !statusFilter || client.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const allExportFields = [
    { key: 'name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'location', label: 'Location' },
    { key: 'gender', label: 'Gender' },
    { key: 'skin_type', label: 'Skin Type' },
    { key: 'allergies', label: 'Allergies' },
    { key: 'total_bookings', label: 'Total Bookings' },
    { key: 'total_spent', label: 'Total Spent' },
    { key: 'last_visit', label: 'Last Visit' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Joined Date' },
  ]

  const toggleExportField = (field: string) => {
    setExportFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    )
  }

  const exportClients = (format: 'csv' | 'json') => {
    const dataToExport = filteredClients.map(client => {
      const row: Record<string, unknown> = {}
      exportFields.forEach(field => {
        switch (field) {
          case 'name':
            row['Full Name'] = `${client.first_name} ${client.last_name}`
            break
          case 'email':
            row['Email'] = client.email
            break
          case 'phone':
            row['Phone'] = client.phone
            break
          case 'location':
            row['Location'] = client.location
            break
          case 'gender':
            row['Gender'] = client.gender || 'N/A'
            break
          case 'skin_type':
            row['Skin Type'] = client.skin_type || 'N/A'
            break
          case 'allergies':
            row['Allergies'] = client.allergies?.join(', ') || 'None'
            break
          case 'total_bookings':
            row['Total Bookings'] = client.total_bookings
            break
          case 'total_spent':
            row['Total Spent'] = client.total_spent
            break
          case 'last_visit':
            row['Last Visit'] = client.last_visit || 'Never'
            break
          case 'status':
            row['Status'] = client.status
            break
          case 'created_at':
            row['Joined Date'] = new Date(client.created_at).toLocaleDateString()
            break
        }
      })
      return row
    })

    if (format === 'csv') {
      const headers = Object.keys(dataToExport[0] || {})
      const rows = dataToExport.map(row => headers.map(h => `"${row[h]}"`).join(','))
      const csv = [headers.join(','), ...rows].join('\n')
      downloadFile(csv, `clients-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
    } else {
      const json = JSON.stringify(dataToExport, null, 2)
      downloadFile(json, `clients-${new Date().toISOString().split('T')[0]}.json`, 'application/json')
    }
    setShowExportModal(false)
  }

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const addNote = () => {
    if (!newNote.trim()) return
    const note: ClientNote = {
      id: `n${Date.now()}`,
      note: newNote,
      created_by: 'Admin',
      created_at: new Date().toISOString(),
    }
    setNotes(prev => [note, ...prev])
    setNewNote('')
  }

  const getClientStats = () => {
    const total = clients.length
    const active = clients.filter(c => c.status === 'active').length
    const vip = clients.filter(c => c.status === 'vip').length
    const newClients = clients.filter(c => c.status === 'new').length
    return { total, active, vip, newClients }
  }

  const clientStats = getClientStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage all client information</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E] text-white font-medium rounded-lg hover:bg-[#5A1D6A] transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Client
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-100">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{clientStats.total}</p>
                <p className="text-sm text-gray-500">Total Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-green-100">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{clientStats.active}</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-100">
                <Star className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{clientStats.vip}</p>
                <p className="text-sm text-gray-500">VIP Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-100">
                <UserPlus className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{clientStats.newClients}</p>
                <p className="text-sm text-gray-500">New This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="vip">VIP</option>
              <option value="new">New</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Clients</CardTitle>
          <CardDescription>{filteredClients.length} clients found</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-3 border-[#7B2D8E] border-t-transparent rounded-full" />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No clients found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Visit</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-[#7B2D8E]">
                              {client.first_name[0]}{client.last_name[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{client.first_name} {client.last_name}</p>
                            {client.skin_type && (
                              <p className="text-xs text-gray-500">{client.skin_type} skin</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            <span className="truncate max-w-[150px]">{client.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span>{client.phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span>{client.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900">{client.total_bookings}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900">{formatCurrency(client.total_spent)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusConfig[client.status].color}>
                          {statusConfig[client.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {client.last_visit 
                            ? new Date(client.last_visit).toLocaleDateString() 
                            : 'Never'
                          }
                        </span>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => setSelectedClient(client)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-[#7B2D8E]">
                    {selectedClient.first_name[0]}{selectedClient.last_name[0]}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedClient.first_name} {selectedClient.last_name}
                  </h3>
                  <Badge variant="outline" className={statusConfig[selectedClient.status].color}>
                    {statusConfig[selectedClient.status].label}
                  </Badge>
                </div>
              </div>
              <button onClick={() => setSelectedClient(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 px-4 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'details'
                    ? 'border-[#7B2D8E] text-[#7B2D8E]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-[#7B2D8E] text-[#7B2D8E]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Booking History
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'notes'
                    ? 'border-[#7B2D8E] text-[#7B2D8E]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Notes
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'details' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-3">Contact Information</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{selectedClient.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{selectedClient.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{selectedClient.location}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-3">Personal Details</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Gender:</span>
                          <span className="text-gray-700">{selectedClient.gender || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Date of Birth:</span>
                          <span className="text-gray-700">
                            {selectedClient.date_of_birth 
                              ? new Date(selectedClient.date_of_birth).toLocaleDateString() 
                              : 'Not specified'
                            }
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Member Since:</span>
                          <span className="text-gray-700">
                            {new Date(selectedClient.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-3">Skin Profile</h4>
                      <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Skin Type:</span>
                          <span className="font-medium text-gray-700">{selectedClient.skin_type || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Allergies:</span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedClient.allergies && selectedClient.allergies.length > 0 ? (
                              selectedClient.allergies.map((allergy, i) => (
                                <Badge key={i} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  {allergy}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-gray-400">No known allergies</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-3">Booking Stats</h4>
                      <div className="p-4 bg-[#7B2D8E]/5 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Total Bookings:</span>
                          <span className="font-bold text-gray-900">{selectedClient.total_bookings}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Total Spent:</span>
                          <span className="font-bold text-[#7B2D8E]">{formatCurrency(selectedClient.total_spent)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Last Visit:</span>
                          <span className="text-gray-700">
                            {selectedClient.last_visit 
                              ? new Date(selectedClient.last_visit).toLocaleDateString() 
                              : 'Never'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-4">
                  {history.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No booking history</p>
                    </div>
                  ) : (
                    history.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-[#7B2D8E]" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{item.service_name}</p>
                            <p className="text-sm text-gray-500">by {item.staff_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{formatCurrency(item.amount)}</p>
                          <p className="text-sm text-gray-500">{new Date(item.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a note about this client..."
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                    />
                    <button
                      onClick={addNote}
                      disabled={!newNote.trim()}
                      className="px-4 py-2 bg-[#7B2D8E] text-white rounded-lg hover:bg-[#5A1D6A] transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div key={note.id} className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{note.note}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                          <span>{note.created_by}</span>
                          <span>-</span>
                          <span>{new Date(note.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 p-4 flex gap-3">
              <button
                onClick={() => setSelectedClient(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                className="flex-1 px-4 py-2 bg-[#7B2D8E] text-white rounded-lg hover:bg-[#5A1D6A] transition-colors flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Export Clients</h3>
              <button onClick={() => setShowExportModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Select fields to export:</p>
                <div className="grid grid-cols-2 gap-2">
                  {allExportFields.map(field => (
                    <label key={field.key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportFields.includes(field.key)}
                        onChange={() => toggleExportField(field.key)}
                        className="w-4 h-4 rounded border-gray-300 text-[#7B2D8E] focus:ring-[#7B2D8E]"
                      />
                      <span className="text-sm text-gray-700">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Exporting {filteredClients.length} clients with {exportFields.length} fields
              </p>
            </div>
            <div className="border-t border-gray-200 p-4 flex gap-3">
              <button
                onClick={() => exportClients('csv')}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => exportClients('json')}
                className="flex-1 px-4 py-2 bg-[#7B2D8E] text-white rounded-lg hover:bg-[#5A1D6A] transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
