'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import {
  ClipboardList, Star, ChevronLeft, ChevronRight,
  TrendingUp, Users, ThumbsUp,
} from 'lucide-react'

interface Survey {
  id: number
  user_id: string | null
  user_email: string | null
  aesthetics: string
  ambiance: string
  front_desk: string
  staff_professional: string
  appointment_delay: string
  overall_rating: number
  visit_again: string
  comments: string | null
  created_at: string
  first_name: string | null
  last_name: string | null
}

interface Analytics {
  avgRating: number
  ratingDistribution: { rating: number; count: number }[]
  satisfaction: {
    aesthetics: number
    ambiance: number
    frontDesk: number
    staff: number
    wouldReturn: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const COLORS = ['#EF4444', '#F59E0B', '#FBBF24', '#84CC16', '#10B981']

export default function SurveysPage() {
  const router = useRouter()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)

  const fetchSurveys = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      const res = await fetch(`/api/admin/surveys?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSurveys(data.surveys)
        setPagination(data.pagination)
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Failed to fetch surveys:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit])

  useEffect(() => {
    fetchSurveys()
  }, [fetchSurveys])

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
      />
    ))
  }

  const satisfactionItems = analytics ? [
    { label: 'Aesthetics', value: analytics.satisfaction.aesthetics },
    { label: 'Ambiance', value: analytics.satisfaction.ambiance },
    { label: 'Front Desk', value: analytics.satisfaction.frontDesk },
    { label: 'Staff', value: analytics.satisfaction.staff },
    { label: 'Would Return', value: analytics.satisfaction.wouldReturn },
  ] : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        {/* Page titles use 20px/semibold — Google-admin scale. */}
        <h1 className="text-xl font-semibold text-gray-900">Survey responses</h1>
        <p className="text-sm text-gray-500 mt-1">View customer feedback and satisfaction metrics</p>
      </div>

      {/* Analytics cards — smaller icon chips on a neutral gray background so
          the row doesn't read as three saturated purple blocks stacked on
          mobile. The brand color stays on the icon glyph itself (and on
          interactive affordances elsewhere on the page), which keeps the
          page cohesive without being overwhelmingly tinted. Card padding
          tightened from p-4 to p-3.5 and the number from text-2xl to text-xl
          to address the "looks big" stacking on phones. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3.5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-gray-100">
                <Star className="w-4 h-4 text-[#7B2D8E]" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 leading-tight">
                  {analytics?.avgRating.toFixed(1) || '0.0'}
                </p>
                <p className="text-xs text-gray-500">Average rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3.5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-gray-100">
                <ThumbsUp className="w-4 h-4 text-[#7B2D8E]" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 leading-tight">
                  {analytics?.satisfaction.wouldReturn.toFixed(0) || 0}%
                </p>
                <p className="text-xs text-gray-500">Would return</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3.5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-gray-100">
                <Users className="w-4 h-4 text-[#7B2D8E]" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 leading-tight">{pagination.total}</p>
                <p className="text-xs text-gray-500">Total responses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rating Distribution</CardTitle>
            <CardDescription>Breakdown of ratings from 1-5 stars</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.ratingDistribution || []}>
                  <XAxis dataKey="rating" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip />
                  <Bar dataKey="count" fill="#7B2D8E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Satisfaction Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Satisfaction Metrics</CardTitle>
            <CardDescription>Percentage of positive responses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {satisfactionItems.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium text-gray-900">{item.value.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#7B2D8E] rounded-full transition-all"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Responses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Responses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-3 border-[#7B2D8E] border-t-transparent rounded-full" />
            </div>
          ) : surveys.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No survey responses yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Respondent</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Would Return</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surveys.map((survey) => (
                  <TableRow
                    key={survey.id}
                    onClick={() => router.push(`/admin/surveys/${survey.id}`)}
                    className="cursor-pointer hover:bg-[#7B2D8E]/5 transition-colors"
                  >
                    <TableCell>
                      <p className="font-medium text-gray-900">
                        {survey.first_name && survey.last_name 
                          ? `${survey.first_name} ${survey.last_name}`
                          : survey.user_email || 'Anonymous'
                        }
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {renderStars(survey.overall_rating)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {/* Soft emerald for "Yes" (still semantically positive)
                          and neutral gray for "No" — no alarm red. */}
                      <Badge
                        variant="outline"
                        className={
                          survey.visit_again === 'Yes'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : survey.visit_again === 'No'
                            ? 'bg-gray-100 text-gray-600 border-gray-200'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                        }
                      >
                        {survey.visit_again}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-600 truncate max-w-[200px]">
                        {survey.comments || '-'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {new Date(survey.created_at).toLocaleDateString()}
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
