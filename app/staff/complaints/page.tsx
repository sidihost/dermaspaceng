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
  MessageSquare, 
  Search,
  Eye,
  Reply,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  User
} from "lucide-react"

interface Complaint {
  id: string
  user_id: string | null
  user_name: string | null
  user_email: string
  name: string
  email: string
  subject: string
  message: string
  category: string
  priority: string
  status: string
  assigned_to: string | null
  created_at: string
  replies: Reply[]
}

interface Reply {
  id: string
  message: string
  responder_name: string
  created_at: string
}

export default function StaffComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("open")
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [replyDialogOpen, setReplyDialogOpen] = useState(false)
  const [replyMessage, setReplyMessage] = useState("")
  const [newStatus, setNewStatus] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchComplaints()
  }, [statusFilter])

  const fetchComplaints = async () => {
    try {
      const params = new URLSearchParams({ status: statusFilter })
      const res = await fetch(`/api/admin/complaints?${params}`)
      const data = await res.json()
      if (data.success) {
        setComplaints(data.complaints)
      }
    } catch (error) {
      console.error("Failed to fetch complaints:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async () => {
    if (!selectedComplaint || !replyMessage.trim()) return
    setSubmitting(true)

    try {
      const res = await fetch("/api/admin/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "complaint",
          entityId: selectedComplaint.id,
          message: replyMessage,
          newStatus: newStatus || undefined,
        }),
      })

      if (res.ok) {
        await fetchComplaints()
        setReplyDialogOpen(false)
        setSelectedComplaint(null)
        setReplyMessage("")
        setNewStatus("")
      }
    } catch (error) {
      console.error("Failed to send reply:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredComplaints = complaints.filter(complaint => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      complaint.name?.toLowerCase().includes(searchLower) ||
      complaint.email?.toLowerCase().includes(searchLower) ||
      complaint.subject?.toLowerCase().includes(searchLower) ||
      complaint.message?.toLowerCase().includes(searchLower)
    )
  })

  // Status badges live inside the Dermaspace brand palette. The previous
  // version used Tailwind/shadcn defaults (destructive red for "open",
  // amber for medium priority, gray secondary for pending) which clashed
  // with the rest of the staff console. We now drive variety with tint
  // depth in the brand purple family — same legibility hierarchy
  // (urgency = saturation) without breaking the colour story.
  const getStatusBadge = (status: string) => {
    const config: Record<string, { cls: string; icon: React.ReactNode }> = {
      pending: {
        cls: "bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20",
        icon: <Clock className="h-3 w-3" />,
      },
      open: {
        cls: "bg-[#7B2D8E]/15 text-[#5A1D6A] border-[#7B2D8E]/30",
        icon: <AlertCircle className="h-3 w-3" />,
      },
      in_progress: {
        cls: "bg-[#7B2D8E] text-white border-[#7B2D8E]",
        icon: <RefreshCw className="h-3 w-3" />,
      },
      resolved: {
        cls: "bg-gray-100 text-gray-700 border-gray-200",
        icon: <CheckCircle2 className="h-3 w-3" />,
      },
    }
    const statusConfig = config[status] || config.pending
    return (
      <Badge
        variant="outline"
        className={`flex items-center gap-1 capitalize ${statusConfig.cls}`}
      >
        {statusConfig.icon}
        {status.replace(/_/g, " ")}
      </Badge>
    )
  }

  // Priority pills also live inside the brand palette. Saturation now
  // tracks urgency: low = neutral gray, medium/high = tinted purple,
  // urgent = solid brand purple.
  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-gray-100 text-gray-700 border-gray-200",
      medium: "bg-[#7B2D8E]/8 text-[#7B2D8E] border-[#7B2D8E]/20",
      high: "bg-[#7B2D8E]/15 text-[#5A1D6A] border-[#7B2D8E]/30",
      urgent: "bg-[#7B2D8E] text-white border-[#7B2D8E]",
    }
    return (
      <Badge variant="outline" className={`capitalize ${colors[priority] || colors.medium}`}>
        {priority}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
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
          Customer Complaints
        </h1>
        <p className="mt-1 text-muted-foreground">
          Respond to and manage customer complaints
        </p>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search complaints..."
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
                <SelectItem value="all">All Complaints</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Complaints List */}
      <Card className="border-border/50">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            Complaints
          </CardTitle>
          <CardDescription>
            {filteredComplaints.length} complaint(s) found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-[#7B2D8E]" />
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E]">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="mt-4 text-lg font-medium text-gray-900">No complaints</p>
              <p className="text-sm text-gray-500">All complaints have been resolved</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredComplaints.map((complaint) => (
                <div 
                  key={complaint.id} 
                  className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {complaint.subject || "No Subject"}
                      </span>
                      {getStatusBadge(complaint.status)}
                      {getPriorityBadge(complaint.priority || "medium")}
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {complaint.message}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{complaint.name || "Anonymous"}</span>
                      <span>-</span>
                      <span>{complaint.email}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(complaint.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2 sm:shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedComplaint(complaint)}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      View
                    </Button>
                    {complaint.status !== "resolved" && (
                      <Button 
                        size="sm"
                        onClick={() => {
                          setSelectedComplaint(complaint)
                          setReplyDialogOpen(true)
                        }}
                      >
                        <Reply className="mr-1 h-4 w-4" />
                        Reply
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
      <Dialog open={!!selectedComplaint && !replyDialogOpen} onOpenChange={() => setSelectedComplaint(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedComplaint?.subject || "Complaint Details"}</DialogTitle>
            <DialogDescription>
              Full complaint information and conversation history
            </DialogDescription>
          </DialogHeader>
          {selectedComplaint && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {getStatusBadge(selectedComplaint.status)}
                {getPriorityBadge(selectedComplaint.priority || "medium")}
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">From</Label>
                  <p className="font-medium">{selectedComplaint.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedComplaint.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Submitted</Label>
                  <p className="text-sm">{formatDate(selectedComplaint.created_at)}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Message</Label>
                <div className="mt-1 rounded-lg bg-muted/50 p-4">
                  <p className="whitespace-pre-wrap text-sm">{selectedComplaint.message}</p>
                </div>
              </div>

              {selectedComplaint.replies && selectedComplaint.replies.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Conversation</Label>
                  <div className="mt-2 space-y-3">
                    {selectedComplaint.replies.map((reply) => (
                      <div key={reply.id} className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-medium text-primary">{reply.responder_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(reply.created_at)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedComplaint?.status !== "resolved" && (
              <Button onClick={() => setReplyDialogOpen(true)}>
                <Reply className="mr-2 h-4 w-4" />
                Reply
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to Complaint</DialogTitle>
            <DialogDescription>
              Send a response to the customer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Your Response</Label>
              <Textarea
                placeholder="Type your response..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                className="mt-1"
                rows={6}
              />
            </div>
            <div>
              <Label>Update Status (Optional)</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Keep current status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">Mark as In Progress</SelectItem>
                  <SelectItem value="resolved">Mark as Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReply} 
              disabled={!replyMessage.trim() || submitting}
            >
              {submitting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
