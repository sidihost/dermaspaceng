"use client"

/**
 * /staff/surveys
 *
 * Customer satisfaction surveys. The previous page expected a fictional
 * "skin analysis" schema (`skin_type`, `skin_concerns`, `age_range`,
 * `routine_products`, `lifestyle_factors`) that doesn't match the real
 * `survey_responses` table — actual columns are `aesthetics`,
 * `ambiance`, `front_desk`, `staff_professional`, `appointment_delay`,
 * `overall_rating`, `visit_again`, `comments`. This rewrite renders the
 * true schema, plus the analytics summary the API computes
 * (satisfaction percentages, average rating, rating distribution).
 *
 * Brand rules: brand purple #7B2D8E, hairline borders, no shadows.
 */

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  FileText,
  Search,
  Eye,
  RefreshCw,
  User,
  Star,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SurveyResponse {
  id: number
  user_id: string | null
  user_email: string | null
  first_name?: string | null
  last_name?: string | null
  aesthetics: string | null
  ambiance: string | null
  front_desk: string | null
  staff_professional: string | null
  appointment_delay: string | null
  overall_rating: number | null
  visit_again: string | null
  comments: string | null
  created_at: string
}

interface Analytics {
  avgRating: number
  ratingDistribution: Array<{ rating: number; count: number }>
  satisfaction: {
    aesthetics: number
    ambiance: number
    frontDesk: number
    staff: number
    wouldReturn: number
  }
}

interface ApiResponse {
  surveys: SurveyResponse[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
  analytics: Analytics
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

const displayName = (s: SurveyResponse) => {
  const full = [s.first_name, s.last_name].filter(Boolean).join(" ").trim()
  if (full) return full
  return s.user_email || "Anonymous"
}

const positiveAnswers = new Set(["Strongly Agree", "Agree", "Yes"])

const isPositive = (val: string | null | undefined) =>
  Boolean(val && positiveAnswers.has(val))

export default function StaffSurveysPage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [ratingFilter, setRatingFilter] = useState("all")
  const [selected, setSelected] = useState<SurveyResponse | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (ratingFilter !== "all") params.set("rating", ratingFilter)
      const res = await fetch(`/api/admin/surveys?${params}`, { cache: "no-store" })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || `HTTP ${res.status} — could not load surveys`)
        return
      }
      const json = (await res.json()) as ApiResponse
      setData(json)
    } catch (err) {
      console.error("Surveys fetch failed:", err)
      setError("Network error. Check your connection and retry.")
    } finally {
      setLoading(false)
    }
  }, [ratingFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const surveys = data?.surveys ?? []
  const filtered = surveys.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      displayName(s).toLowerCase().includes(q) ||
      s.user_email?.toLowerCase().includes(q) ||
      s.comments?.toLowerCase().includes(q)
    )
  })

  const renderStars = (rating: number | null, size: "sm" | "md" = "sm") => {
    const px = size === "md" ? "h-4 w-4" : "h-3 w-3"
    if (!rating) return <span className="text-xs text-gray-400">Not rated</span>
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              px,
              star <= rating ? "fill-[#7B2D8E] text-[#7B2D8E]" : "text-gray-200",
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Customer surveys
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Post-visit feedback from customers.
        </p>
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">Could not load surveys</p>
            <p className="text-xs text-gray-500 mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchData}
            className="text-xs font-semibold text-[#7B2D8E] hover:underline flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Analytics row */}
      {data?.analytics && (
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <AnalyticsCard
            label="Avg rating"
            value={data.analytics.avgRating.toFixed(1)}
            sub={`${data.pagination.total} responses`}
            primary
          />
          <AnalyticsCard
            label="Aesthetics"
            value={`${Math.round(data.analytics.satisfaction.aesthetics)}%`}
            sub="positive"
          />
          <AnalyticsCard
            label="Ambiance"
            value={`${Math.round(data.analytics.satisfaction.ambiance)}%`}
            sub="positive"
          />
          <AnalyticsCard
            label="Front desk"
            value={`${Math.round(data.analytics.satisfaction.frontDesk)}%`}
            sub="positive"
          />
          <AnalyticsCard
            label="Staff"
            value={`${Math.round(data.analytics.satisfaction.staff)}%`}
            sub="positive"
          />
          <AnalyticsCard
            label="Would return"
            value={`${Math.round(data.analytics.satisfaction.wouldReturn)}%`}
            sub="yes"
          />
        </div>
      )}

      {/* Filters */}
      <Card className="border-gray-100 rounded-2xl">
        <CardContent className="p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by name, email, comments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 border-gray-200 focus-visible:ring-[#7B2D8E]/30"
              />
            </div>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ratings</SelectItem>
                <SelectItem value="5">5 stars</SelectItem>
                <SelectItem value="4">4 stars</SelectItem>
                <SelectItem value="3">3 stars</SelectItem>
                <SelectItem value="2">2 stars</SelectItem>
                <SelectItem value="1">1 star</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-gray-100 rounded-2xl">
        <CardHeader className="border-b border-gray-100 pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <FileText className="h-4 w-4 text-[#7B2D8E]" />
            Responses
          </CardTitle>
          <CardDescription className="text-xs">
            {filtered.length} {filtered.length === 1 ? "response" : "responses"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-5 w-5 animate-spin text-[#7B2D8E]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <div className="h-11 w-11 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E]">
                <FileText className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-900">No survey responses</p>
              <p className="mt-1 text-xs text-gray-500">
                {error ? "Retry above when ready." : "Survey responses will appear here."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-[#7B2D8E]/[0.03] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7B2D8E]/10 text-[10.5px] font-bold uppercase text-[#7B2D8E] flex-shrink-0">
                        <User className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-semibold text-gray-900 truncate">
                        {displayName(s)}
                      </span>
                      {renderStars(s.overall_rating)}
                      {s.visit_again === "Yes" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] ring-1 ring-[#7B2D8E]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                          <ThumbsUp className="h-2.5 w-2.5" />
                          Will return
                        </span>
                      )}
                      {s.visit_again === "No" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 text-gray-700 ring-1 ring-gray-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                          <ThumbsDown className="h-2.5 w-2.5" />
                          Won&apos;t return
                        </span>
                      )}
                    </div>
                    {s.comments && (
                      <p className="line-clamp-2 text-sm text-gray-600 italic">
                        &ldquo;{s.comments}&rdquo;
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                      {s.user_email && <span>{s.user_email}</span>}
                      <span>{formatDate(s.created_at)}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelected(s)}
                    className="gap-1 border-gray-200 flex-shrink-0"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Details
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Details dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Survey response</DialogTitle>
            <DialogDescription>Full feedback from this customer</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              {/* Identity */}
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E]">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{displayName(selected)}</p>
                  {selected.user_email && (
                    <p className="text-xs text-gray-500">{selected.user_email}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(selected.created_at)}
                  </p>
                </div>
                <div className="ml-auto text-right flex-shrink-0">
                  <Label className="text-xs text-gray-500">Overall</Label>
                  <div className="mt-0.5">{renderStars(selected.overall_rating, "md")}</div>
                </div>
              </div>

              {/* Question grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <QuestionRow label="Aesthetics" value={selected.aesthetics} />
                <QuestionRow label="Ambiance" value={selected.ambiance} />
                <QuestionRow label="Front desk" value={selected.front_desk} />
                <QuestionRow label="Staff professionalism" value={selected.staff_professional} />
                <QuestionRow label="Appointment on time" value={selected.appointment_delay} />
                <QuestionRow label="Would visit again" value={selected.visit_again} />
              </div>

              {/* Comments */}
              {selected.comments && (
                <div>
                  <Label className="text-xs text-gray-500">Comments</Label>
                  <p className="mt-1 rounded-md bg-gray-50 p-3 text-sm italic">
                    &ldquo;{selected.comments}&rdquo;
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AnalyticsCard({
  label,
  value,
  sub,
  primary,
}: {
  label: string
  value: string
  sub?: string
  primary?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        primary
          ? "border-[#7B2D8E]/30 bg-[#7B2D8E]/5"
          : "border-gray-100 bg-white",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-lg font-bold tabular-nums leading-tight",
          primary ? "text-[#7B2D8E]" : "text-gray-900",
        )}
      >
        {value}
      </p>
      {sub && <p className="text-[10.5px] text-gray-500 leading-tight">{sub}</p>}
    </div>
  )
}

function QuestionRow({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  const positive = isPositive(value)
  return (
    <div className="rounded-lg border border-gray-100 px-3 py-2">
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold",
          positive
            ? "text-[#7B2D8E]"
            : value
              ? "text-gray-700"
              : "text-gray-400",
        )}
      >
        {value || "—"}
      </p>
    </div>
  )
}
