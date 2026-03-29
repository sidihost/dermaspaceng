"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  Calendar, 
  Search,
  Eye,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  User,
  Phone,
  Mail
} from "lucide-react"

interface Consultation {
  id: string
  user_id: string | null
  user_name: string | null
  user_email: string
  full_name: string
  email: string
  phone: string
  concern_type: string
  concern_description: string
  preferred_date: string
  preferred_time: string
  status: string
  created_at: string
}

export default function StaffConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("pending")
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)
  const [replyDialogOpen, setReplyDialogOpen] = useState(false)
  const [replyMessage, setReplyMessage] = useState("")
  const [newStatus, setNewStatus] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchConsultations()
  }, [statusFilter])

  const fetchConsultations = async () => {
    try {
      const params = new URLSearchParams({ status: statusFilter })
      const res = await fetch(`/api/admin/consultations?${params}`)
      const data = await res.json()
      if (data.success) {
        setConsultations(data.consultations)
      }
    } catch (error) {
      console.error("Failed to fetch consultations:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!selectedConsultation || !newStatus) return
    setSubmitting(true)

    try {
      const res = await fetch("/api/admin/consultations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedConsultation.id,
          status: newStatus,
          reply: replyMessage || undefined,
        }),
      })

      if (res.ok) {
        await fetchConsultations()
        setReplyDialogOpen(false)
        setSelectedConsultation(null)
        setReplyMessage("")
        setNewStatus("")
      }
    } catch (error) {
      console.error("Failed to update consultation:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredConsultations = consultations.filter(consultation => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      consultation.full_name?.toLowerCase().includes(searchLower) ||
      consultation.email?.toLowerCase().includes(searchLower) ||
      consultation.concern_type?.toLowerCase().includes(searchLower)
    )
  })

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: React.ReactNode }> = {
      pending: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
      confirmed: { variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
      completed: { variant: "outline", icon: <CheckCircle2 className="h-3 w-3" /> },
      cancelled: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
    }
    const statusConfig = config[status] || config.pending
    return (
      <Badge variant={statusConfig.variant} className="flex items-center gap-1 capitalize">
        {statusConfig.icon}
        {status}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Consultations
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage consultation requests and appointments
        </p>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search consultations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Consultations List */}
      <Card className="border-border/50">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Consultations
          </CardTitle>
          <CardDescription>
            {filteredConsultations.length} consultation(s) found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConsultations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">No consultations found</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredConsultations.map((consultation) => (
                <div 
                  key={consultation.id} 
                  className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">
                        {consultation.full_name}
                      </span>
                      {getStatusBadge(consultation.status)}
                      <Badge variant="outline" className="capitalize">
                        {consultation.concern_type}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {consultation.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {consultation.phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">
                        Preferred: {formatDate(consultation.preferred_date)} at {consultation.preferred_time}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Submitted: {formatDateTime(consultation.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2 sm:shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedConsultation(consultation)}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      View
                    </Button>
                    {consultation.status === "pending" && (
                      <Button 
                        size="sm"
                        onClick={() => {
                          setSelectedConsultation(consultation)
                          setReplyDialogOpen(true)
                        }}
                      >
                        <MessageSquare className="mr-1 h-4 w-4" />
                        Respond
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!selectedConsultation && !replyDialogOpen} onOpenChange={() => setSelectedConsultation(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Consultation Details</DialogTitle>
            <DialogDescription>
              Full consultation information
            </DialogDescription>
          </DialogHeader>
          {selectedConsultation && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedConsultation.status)}
                <Badge variant="outline" className="capitalize">
                  {selectedConsultation.concern_type}
                </Badge>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{selectedConsultation.full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedConsultation.email}</p>
                    <p className="text-sm text-muted-foreground">{selectedConsultation.phone}</p>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Preferred Appointment</Label>
                <div className="mt-1 flex items-center gap-2 text-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {formatDate(selectedConsultation.preferred_date)} at {selectedConsultation.preferred_time}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Concern Description</Label>
                <p className="mt-1 rounded-md bg-muted/50 p-3 text-sm">
                  {selectedConsultation.concern_description || "No description provided"}
                </p>
              </div>

              <div className="text-right">
                <Label className="text-muted-foreground">Submitted</Label>
                <p className="text-sm">{formatDateTime(selectedConsultation.created_at)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedConsultation?.status === "pending" && (
              <Button onClick={() => setReplyDialogOpen(true)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Respond
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Consultation</DialogTitle>
            <DialogDescription>
              Update the status and notify the customer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Update Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirm Appointment</SelectItem>
                  <SelectItem value="completed">Mark as Completed</SelectItem>
                  <SelectItem value="cancelled">Cancel Appointment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message to Customer (Optional)</Label>
              <Textarea
                placeholder="Add any additional information..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStatusUpdate} 
              disabled={!newStatus || submitting}
            >
              {submitting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
