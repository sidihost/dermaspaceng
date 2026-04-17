"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Activity, 
  Search, 
  Filter, 
  User, 
  Gift, 
  MessageSquare, 
  Calendar,
  FileText,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react"

interface ActivityItem {
  id: string
  actor_id: string
  actor_name: string
  actor_role: string
  action: string
  entity_type: string
  entity_id: string
  details: string
  created_at: string
}

const actionIcons: Record<string, React.ReactNode> = {
  create: <UserPlus className="h-4 w-4" />,
  update: <Edit className="h-4 w-4" />,
  delete: <Trash2 className="h-4 w-4" />,
  view: <Eye className="h-4 w-4" />,
  reply: <MessageSquare className="h-4 w-4" />,
  status_change: <RefreshCw className="h-4 w-4" />,
}

const entityIcons: Record<string, React.ReactNode> = {
  user: <User className="h-4 w-4" />,
  gift_card: <Gift className="h-4 w-4" />,
  complaint: <MessageSquare className="h-4 w-4" />,
  consultation: <Calendar className="h-4 w-4" />,
  survey: <FileText className="h-4 w-4" />,
}

// Brand-aligned, muted action colors. Reply uses the Dermaspace purple
// (our primary brand action), create stays soft emerald, destructive
// actions fall back to neutral gray instead of alarm-red, and the rest
// use calm soft tones so the timeline reads as polished, not chaotic.
const actionColors: Record<string, string> = {
  create: "bg-emerald-50 text-emerald-700 border-emerald-200",
  update: "bg-sky-50 text-sky-700 border-sky-200",
  delete: "bg-gray-100 text-gray-600 border-gray-200",
  view: "bg-gray-50 text-gray-600 border-gray-200",
  reply: "bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20",
  status_change: "bg-amber-50 text-amber-700 border-amber-200",
}

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterAction, setFilterAction] = useState("all")
  const [filterEntity, setFilterEntity] = useState("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchActivities()
  }, [page, filterAction, filterEntity])

  const fetchActivities = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(filterAction !== "all" && { action: filterAction }),
        ...(filterEntity !== "all" && { entity_type: filterEntity }),
      })
      const res = await fetch(`/api/admin/activity?${params}`)
      const data = await res.json()
      if (data.success) {
        setActivities(data.activities)
        setTotalPages(data.totalPages || 1)
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredActivities = activities.filter(activity => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      activity.actor_name?.toLowerCase().includes(searchLower) ||
      activity.action?.toLowerCase().includes(searchLower) ||
      activity.entity_type?.toLowerCase().includes(searchLower) ||
      activity.details?.toLowerCase().includes(searchLower)
    )
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const formatAction = (action: string) => {
    return action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  }

  const formatEntity = (entity: string) => {
    return entity.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Activity Log</h1>
          <p className="mt-1 text-muted-foreground">
            Track all actions performed by staff and admins
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => fetchActivities()}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="reply">Reply</SelectItem>
                  <SelectItem value="status_change">Status Change</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterEntity} onValueChange={setFilterEntity}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="gift_card">Gift Cards</SelectItem>
                  <SelectItem value="complaint">Complaints</SelectItem>
                  <SelectItem value="consultation">Consultations</SelectItem>
                  <SelectItem value="survey">Surveys</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card className="border-border/50">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Showing {filteredActivities.length} activities
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">No activities found</p>
              <p className="text-sm text-muted-foreground/70">
                Activities will appear here as actions are performed
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredActivities.map((activity, index) => (
                <div 
                  key={activity.id} 
                  className="flex items-start gap-4 p-4 transition-colors hover:bg-muted/30"
                >
                  {/* Timeline indicator */}
                  <div className="relative flex flex-col items-center">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${actionColors[activity.action] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {actionIcons[activity.action] || <Activity className="h-4 w-4" />}
                    </div>
                    {index < filteredActivities.length - 1 && (
                      <div className="absolute top-10 h-full w-px bg-border/50" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">
                        {activity.actor_name || "System"}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {activity.actor_role || "system"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground/80">{formatAction(activity.action)}</span>
                      {" "}
                      <span className="inline-flex items-center gap-1">
                        {entityIcons[activity.entity_type]}
                        {formatEntity(activity.entity_type)}
                      </span>
                    </p>
                    {activity.details && (
                      <p className="mt-2 rounded-md bg-muted/50 p-2 text-sm text-muted-foreground">
                        {activity.details}
                      </p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="shrink-0 text-right">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(activity.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
