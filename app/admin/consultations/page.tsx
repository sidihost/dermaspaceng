'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

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

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// Brand-led status palette — "completed" uses the brand fill, in-flight
// states use a soft brand tint, and terminal/cancelled falls back to neutral
// so the list doesn't flip through four unrelated hues.
const statusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20',
  completed: 'bg-[#7B2D8E] text-white border-[#7B2D8E]',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function ConsultationsPage() {
  const router = useRouter()
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const fetchConsultations = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status: statusFilter,
      })
      const res = await fetch(`/api/admin/consultations?${params}`)
      if (res.ok) {
        const data = await res.json()
        setConsultations(data.consultations)
        setPagination(data.pagination)
        setStatusCounts(data.statusCounts)
      }
    } catch (error) {
      console.error('Failed to fetch consultations:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, statusFilter])

  useEffect(() => {
    fetchConsultations()
  }, [fetchConsultations])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Consultations</h1>
        <p className="text-sm text-gray-500 mt-1">Manage consultation requests and appointments</p>
      </div>

      {/* Status Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {['pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(statusFilter === status ? '' : status)
              setPagination(p => ({ ...p, page: 1 }))
            }}
            className={`p-3 rounded-lg border transition-all ${
              statusFilter === status 
                ? 'border-[#7B2D8E] bg-[#7B2D8E]/5' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className="text-xl font-bold text-gray-900">{statusCounts[status] || 0}</p>
            <p className="text-xs text-gray-500 capitalize">{status}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Consultations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-3 border-[#7B2D8E] border-t-transparent rounded-full" />
            </div>
          ) : consultations.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No consultations found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Concerns</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consultations.map((consultation) => (
                  <TableRow
                    key={consultation.id}
                    onClick={() => router.push(`/admin/consultations/${consultation.id}`)}
                    className="cursor-pointer hover:bg-[#7B2D8E]/5 transition-colors"
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{consultation.name}</p>
                        <p className="text-sm text-gray-500">{consultation.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{consultation.location}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(consultation.concerns || []).slice(0, 2).map((concern, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {concern}
                          </Badge>
                        ))}
                        {(consultation.concerns || []).length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{(consultation.concerns || []).length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[consultation.status] || statusColors.pending}>
                        {consultation.status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {new Date(consultation.created_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
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
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
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
