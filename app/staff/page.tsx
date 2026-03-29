"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Gift, 
  MessageSquare, 
  Calendar, 
  FileText,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw
} from "lucide-react"
import Link from "next/link"

interface Stats {
  pendingGiftCards: number
  pendingComplaints: number
  pendingConsultations: number
  recentSurveys: number
}

interface RecentItem {
  id: string
  type: string
  title: string
  status: string
  created_at: string
}

export default function StaffDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/staff/dashboard")
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
        setRecentItems(data.recentItems || [])
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: "Pending Gift Cards",
      value: stats?.pendingGiftCards || 0,
      icon: Gift,
      href: "/staff/gift-cards",
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Open Complaints",
      value: stats?.pendingComplaints || 0,
      icon: MessageSquare,
      href: "/staff/complaints",
      color: "text-rose-600",
      bgColor: "bg-rose-500/10",
    },
    {
      title: "Pending Consultations",
      value: stats?.pendingConsultations || 0,
      icon: Calendar,
      href: "/staff/consultations",
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Recent Surveys",
      value: stats?.recentSurveys || 0,
      icon: FileText,
      href: "/staff/surveys",
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
    },
  ]

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: React.ReactNode }> = {
      pending: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
      open: { variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
      in_progress: { variant: "default", icon: <RefreshCw className="h-3 w-3" /> },
      resolved: { variant: "outline", icon: <CheckCircle2 className="h-3 w-3" /> },
    }
    const config = statusConfig[status] || statusConfig.pending
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {status.replace(/_/g, " ")}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Staff Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage customer requests and support tickets
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => fetchDashboardData()}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="group cursor-pointer border-border/50 transition-all hover:border-primary/30 hover:shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card className="border-border/50">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              Recent Requests
            </CardTitle>
            <CardDescription>
              Latest customer requests requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500/50" />
                <p className="mt-4 text-lg font-medium text-muted-foreground">All caught up!</p>
                <p className="text-sm text-muted-foreground/70">
                  No pending requests at the moment
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {recentItems.slice(0, 5).map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.type} - {formatDate(item.created_at)}
                      </p>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-border/50">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>
              Common tasks you can perform
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid gap-3">
              <Link href="/staff/gift-cards">
                <Button variant="outline" className="h-auto w-full justify-start gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                    <Gift className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Process Gift Card Requests</p>
                    <p className="text-sm text-muted-foreground">Review and approve gift card applications</p>
                  </div>
                </Button>
              </Link>
              <Link href="/staff/complaints">
                <Button variant="outline" className="h-auto w-full justify-start gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10">
                    <MessageSquare className="h-5 w-5 text-rose-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Respond to Complaints</p>
                    <p className="text-sm text-muted-foreground">Help customers with their concerns</p>
                  </div>
                </Button>
              </Link>
              <Link href="/staff/consultations">
                <Button variant="outline" className="h-auto w-full justify-start gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Manage Consultations</p>
                    <p className="text-sm text-muted-foreground">Schedule and confirm appointments</p>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
