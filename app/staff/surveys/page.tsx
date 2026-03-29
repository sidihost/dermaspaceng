"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  Calendar
} from "lucide-react"

interface SurveyResponse {
  id: string
  user_id: string | null
  user_name: string | null
  user_email: string | null
  skin_type: string
  skin_concerns: string[]
  age_range: string
  routine_products: string[]
  budget_range: string
  lifestyle_factors: string[]
  allergies: string
  goals: string
  rating: number | null
  created_at: string
}

export default function StaffSurveysPage() {
  const [surveys, setSurveys] = useState<SurveyResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [skinTypeFilter, setSkinTypeFilter] = useState("all")
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyResponse | null>(null)

  useEffect(() => {
    fetchSurveys()
  }, [skinTypeFilter])

  const fetchSurveys = async () => {
    try {
      const params = new URLSearchParams()
      if (skinTypeFilter !== "all") params.set("skin_type", skinTypeFilter)
      
      const res = await fetch(`/api/admin/surveys?${params}`)
      const data = await res.json()
      if (data.success) {
        setSurveys(data.surveys)
      }
    } catch (error) {
      console.error("Failed to fetch surveys:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSurveys = surveys.filter(survey => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      survey.user_name?.toLowerCase().includes(searchLower) ||
      survey.user_email?.toLowerCase().includes(searchLower) ||
      survey.skin_type?.toLowerCase().includes(searchLower) ||
      survey.goals?.toLowerCase().includes(searchLower)
    )
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-muted-foreground">Not rated</span>
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            className={`h-4 w-4 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} 
          />
        ))}
      </div>
    )
  }

  const getSkinTypeBadge = (skinType: string) => {
    const colors: Record<string, string> = {
      oily: "bg-blue-100 text-blue-700 border-blue-200",
      dry: "bg-amber-100 text-amber-700 border-amber-200",
      combination: "bg-purple-100 text-purple-700 border-purple-200",
      normal: "bg-emerald-100 text-emerald-700 border-emerald-200",
      sensitive: "bg-rose-100 text-rose-700 border-rose-200",
    }
    return (
      <Badge variant="outline" className={`capitalize ${colors[skinType] || ""}`}>
        {skinType}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Survey Responses
        </h1>
        <p className="mt-1 text-muted-foreground">
          View customer skin analysis survey responses
        </p>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search surveys..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={skinTypeFilter} onValueChange={setSkinTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by skin type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Skin Types</SelectItem>
                <SelectItem value="oily">Oily</SelectItem>
                <SelectItem value="dry">Dry</SelectItem>
                <SelectItem value="combination">Combination</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="sensitive">Sensitive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Surveys List */}
      <Card className="border-border/50">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Responses
          </CardTitle>
          <CardDescription>
            {filteredSurveys.length} survey response(s) found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSurveys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">No surveys found</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredSurveys.map((survey) => (
                <div 
                  key={survey.id} 
                  className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {survey.user_name || "Anonymous"}
                      </span>
                      {getSkinTypeBadge(survey.skin_type)}
                      <Badge variant="outline" className="capitalize">
                        {survey.age_range}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {survey.skin_concerns?.slice(0, 3).map((concern, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {concern}
                        </Badge>
                      ))}
                      {survey.skin_concerns?.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{survey.skin_concerns.length - 3} more
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(survey.created_at)}
                      </span>
                      {renderStars(survey.rating)}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedSurvey(survey)}
                    className="sm:shrink-0"
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!selectedSurvey} onOpenChange={() => setSelectedSurvey(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Survey Response Details</DialogTitle>
            <DialogDescription>
              Complete skin analysis survey response
            </DialogDescription>
          </DialogHeader>
          {selectedSurvey && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {selectedSurvey.user_name || "Anonymous"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedSurvey.user_email || "No email provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label className="text-muted-foreground">Skin Type</Label>
                  <div className="mt-1">{getSkinTypeBadge(selectedSurvey.skin_type)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Age Range</Label>
                  <p className="mt-1 font-medium capitalize">{selectedSurvey.age_range}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Budget Range</Label>
                  <p className="mt-1 font-medium capitalize">{selectedSurvey.budget_range}</p>
                </div>
              </div>

              {/* Skin Concerns */}
              <div>
                <Label className="text-muted-foreground">Skin Concerns</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedSurvey.skin_concerns?.map((concern, idx) => (
                    <Badge key={idx} variant="secondary">{concern}</Badge>
                  ))}
                </div>
              </div>

              {/* Routine Products */}
              <div>
                <Label className="text-muted-foreground">Current Routine Products</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedSurvey.routine_products?.map((product, idx) => (
                    <Badge key={idx} variant="outline">{product}</Badge>
                  ))}
                </div>
              </div>

              {/* Lifestyle Factors */}
              <div>
                <Label className="text-muted-foreground">Lifestyle Factors</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedSurvey.lifestyle_factors?.map((factor, idx) => (
                    <Badge key={idx} variant="outline">{factor}</Badge>
                  ))}
                </div>
              </div>

              {/* Allergies */}
              {selectedSurvey.allergies && (
                <div>
                  <Label className="text-muted-foreground">Allergies / Sensitivities</Label>
                  <p className="mt-1 rounded-md bg-rose-50 p-3 text-sm text-rose-700">
                    {selectedSurvey.allergies}
                  </p>
                </div>
              )}

              {/* Goals */}
              <div>
                <Label className="text-muted-foreground">Skincare Goals</Label>
                <p className="mt-1 rounded-md bg-muted/50 p-3 text-sm">
                  {selectedSurvey.goals || "No goals specified"}
                </p>
              </div>

              {/* Rating & Date */}
              <div className="flex items-center justify-between border-t border-border/50 pt-4">
                <div>
                  <Label className="text-muted-foreground">Rating</Label>
                  <div className="mt-1">{renderStars(selectedSurvey.rating)}</div>
                </div>
                <div className="text-right">
                  <Label className="text-muted-foreground">Submitted</Label>
                  <p className="text-sm">{formatDate(selectedSurvey.created_at)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
