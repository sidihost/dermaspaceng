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
  Gift, 
  Search,
  Eye,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send
} from "lucide-react"

interface GiftCardRequest {
  id: string
  user_id: string
  user_name: string
  user_email: string
  amount: number
  recipient_name: string
  recipient_email: string
  message: string
  status: string
  created_at: string
  processed_at: string | null
  processed_by: string | null
}

export default function StaffGiftCardsPage() {
  const [requests, setRequests] = useState<GiftCardRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("pending")
  const [selectedRequest, setSelectedRequest] = useState<GiftCardRequest | null>(null)
  const [replyDialogOpen, setReplyDialogOpen] = useState(false)
  const [replyMessage, setReplyMessage] = useState("")
  const [newStatus, setNewStatus] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchRequests()
  }, [statusFilter])

  const fetchRequests = async () => {
    try {
      const params = new URLSearchParams({ status: statusFilter })
      const res = await fetch(`/api/admin/gift-cards?${params}`)
      const data = await res.json()
      if (data.success) {
        setRequests(data.requests)
      }
    } catch (error) {
      console.error("Failed to fetch gift card requests:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!selectedRequest || !newStatus) return
    setSubmitting(true)

    try {
      const res = await fetch("/api/admin/gift-cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRequest.id,
          status: newStatus,
          reply: replyMessage || undefined,
        }),
      })

      if (res.ok) {
        await fetchRequests()
        setReplyDialogOpen(false)
        setSelectedRequest(null)
        setReplyMessage("")
        setNewStatus("")
      }
    } catch (error) {
      console.error("Failed to update request:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredRequests = requests.filter(request => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      request.user_name?.toLowerCase().includes(searchLower) ||
      request.user_email?.toLowerCase().includes(searchLower) ||
      request.recipient_name?.toLowerCase().includes(searchLower) ||
      request.recipient_email?.toLowerCase().includes(searchLower)
    )
  })

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: React.ReactNode }> = {
      pending: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
      approved: { variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
      rejected: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
      processing: { variant: "outline", icon: <RefreshCw className="h-3 w-3" /> },
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
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Gift Card Requests
        </h1>
        <p className="mt-1 text-muted-foreground">
          Process and manage gift card applications
        </p>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
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
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card className="border-border/50">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5 text-primary" />
            Requests
          </CardTitle>
          <CardDescription>
            {filteredRequests.length} request(s) found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Gift className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">No requests found</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredRequests.map((request) => (
                <div 
                  key={request.id} 
                  className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">
                        {request.user_name || "Unknown User"}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {request.user_email}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="font-semibold text-primary">
                        {formatCurrency(request.amount)}
                      </span>
                      <span className="text-muted-foreground">
                        To: {request.recipient_name} ({request.recipient_email})
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(request.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2 sm:shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      View
                    </Button>
                    {request.status === "pending" && (
                      <Button 
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request)
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
      <Dialog open={!!selectedRequest && !replyDialogOpen} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gift Card Request Details</DialogTitle>
            <DialogDescription>
              Review the full request information
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">From</Label>
                  <p className="font-medium">{selectedRequest.user_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.user_email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(selectedRequest.amount)}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Recipient</Label>
                <p className="font-medium">{selectedRequest.recipient_name}</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.recipient_email}</p>
              </div>
              {selectedRequest.message && (
                <div>
                  <Label className="text-muted-foreground">Message</Label>
                  <p className="rounded-md bg-muted/50 p-3 text-sm">{selectedRequest.message}</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div className="text-right">
                  <Label className="text-muted-foreground">Submitted</Label>
                  <p className="text-sm">{formatDate(selectedRequest.created_at)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedRequest?.status === "pending" && (
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
            <DialogTitle>Respond to Request</DialogTitle>
            <DialogDescription>
              Update the status and optionally send a message to the customer
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
                  <SelectItem value="approved">Approve Request</SelectItem>
                  <SelectItem value="rejected">Reject Request</SelectItem>
                  <SelectItem value="processing">Mark as Processing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message to Customer (Optional)</Label>
              <Textarea
                placeholder="Add a note or explanation..."
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
              Send Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
