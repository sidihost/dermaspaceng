"use client"

import { useState, useEffect } from "react"
import { 
  Gift, 
  MessageSquare, 
  Calendar, 
  Bell, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronRight,
  RefreshCw,
  X,
  XCircle
} from "lucide-react"

interface Reply {
  id: string
  message: string
  responder_name: string
  created_at: string
}

interface ActivityItem {
  id: string
  type: "gift_card" | "complaint" | "consultation"
  status: string
  created_at: string
  replies: Reply[]
  // Gift card specific
  amount?: number
  recipient_name?: string
  // Complaint specific
  subject?: string
  message?: string
  priority?: string
  // Consultation specific
  concern_type?: string
  preferred_date?: string
  preferred_time?: string
}

interface Notification {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  link: string | null
  created_at: string
}

export default function ActivityFeed() {
  const [activity, setActivity] = useState<{
    giftCardRequests: ActivityItem[]
    complaints: ActivityItem[]
    consultations: ActivityItem[]
  }>({ giftCardRequests: [], complaints: [], consultations: [] })
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"activity" | "notifications">("activity")
  const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null)

  useEffect(() => {
    fetchActivity()
  }, [])

  const fetchActivity = async () => {
    try {
      const res = await fetch("/api/user/activity")
      const data = await res.json()
      if (data.success) {
        setActivity(data.activity)
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error("Failed to fetch activity:", error)
    } finally {
      setLoading(false)
    }
  }

  const markNotificationsRead = async () => {
    try {
      await fetch("/api/user/activity", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Failed to mark notifications:", error)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      pending: { bg: "bg-amber-100", text: "text-amber-700", icon: <Clock className="w-3 h-3" /> },
      approved: { bg: "bg-emerald-100", text: "text-emerald-700", icon: <CheckCircle2 className="w-3 h-3" /> },
      confirmed: { bg: "bg-emerald-100", text: "text-emerald-700", icon: <CheckCircle2 className="w-3 h-3" /> },
      completed: { bg: "bg-blue-100", text: "text-blue-700", icon: <CheckCircle2 className="w-3 h-3" /> },
      resolved: { bg: "bg-blue-100", text: "text-blue-700", icon: <CheckCircle2 className="w-3 h-3" /> },
      rejected: { bg: "bg-red-100", text: "text-red-700", icon: <XCircle className="w-3 h-3" /> },
      cancelled: { bg: "bg-red-100", text: "text-red-700", icon: <XCircle className="w-3 h-3" /> },
      open: { bg: "bg-orange-100", text: "text-orange-700", icon: <AlertCircle className="w-3 h-3" /> },
      in_progress: { bg: "bg-purple-100", text: "text-purple-700", icon: <RefreshCw className="w-3 h-3" /> },
    }
    return colors[status] || colors.pending
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, { icon: React.ReactNode; color: string }> = {
      gift_card: { icon: <Gift className="w-5 h-5" />, color: "text-pink-600 bg-pink-100" },
      complaint: { icon: <MessageSquare className="w-5 h-5" />, color: "text-orange-600 bg-orange-100" },
      consultation: { icon: <Calendar className="w-5 h-5" />, color: "text-blue-600 bg-blue-100" },
    }
    return icons[type] || icons.complaint
  }

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
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const getTitle = (item: ActivityItem) => {
    switch (item.type) {
      case "gift_card":
        return `Gift Card Request - ₦${item.amount?.toLocaleString()}`
      case "complaint":
        return item.subject || "Support Request"
      case "consultation":
        return `Consultation - ${item.concern_type}`
      default:
        return "Request"
    }
  }

  // Combine all activities and sort by date
  const allActivities = [
    ...activity.giftCardRequests.map(r => ({ ...r, type: "gift_card" as const })),
    ...activity.complaints.map(r => ({ ...r, type: "complaint" as const })),
    ...activity.consultations.map(r => ({ ...r, type: "consultation" as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "activity"
                ? "text-[#7B2D8E] border-b-2 border-[#7B2D8E] bg-[#7B2D8E]/5"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            My Requests
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === "notifications"
                ? "text-[#7B2D8E] border-b-2 border-[#7B2D8E] bg-[#7B2D8E]/5"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Notifications
            {unreadCount > 0 && (
              <span className="absolute top-2 right-4 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === "activity" ? (
            allActivities.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">No requests yet</p>
                <p className="text-gray-400 text-xs mt-1">
                  Your gift card requests, complaints, and consultations will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {allActivities.slice(0, 5).map((item) => {
                  const typeConfig = getTypeIcon(item.type)
                  const statusConfig = getStatusColor(item.status)
                  const hasReplies = item.replies && item.replies.length > 0

                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => setSelectedItem(item)}
                      className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeConfig.color}`}>
                        {typeConfig.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {getTitle(item)}
                          </p>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatDate(item.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                            {statusConfig.icon}
                            {item.status.replace(/_/g, " ")}
                          </span>
                          {hasReplies && (
                            <span className="inline-flex items-center gap-1 text-xs text-[#7B2D8E]">
                              <MessageSquare className="w-3 h-3" />
                              {item.replies.length} reply
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
                    </button>
                  )
                })}
              </div>
            )
          ) : (
            notifications.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">No notifications</p>
                <p className="text-gray-400 text-xs mt-1">
                  You&apos;ll be notified when there are updates to your requests
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markNotificationsRead}
                    className="text-xs text-[#7B2D8E] font-medium hover:underline mb-2"
                  >
                    Mark all as read
                  </button>
                )}
                {notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-xl transition-colors ${
                      notification.is_read ? "bg-white" : "bg-[#7B2D8E]/5"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        notification.is_read ? "bg-gray-100" : "bg-[#7B2D8E]/10"
                      }`}>
                        <Bell className={`w-4 h-4 ${notification.is_read ? "text-gray-400" : "text-[#7B2D8E]"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notification.is_read ? "text-gray-600" : "text-gray-900 font-medium"}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedItem(null)} />
          <div className="relative w-full md:max-w-lg bg-white md:rounded-2xl rounded-t-3xl max-h-[85vh] overflow-hidden">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {getTitle(selectedItem)}
              </h2>
              <button 
                onClick={() => setSelectedItem(null)} 
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4" style={{ maxHeight: "calc(85vh - 70px)" }}>
              {/* Status */}
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(selectedItem.status).bg} ${getStatusColor(selectedItem.status).text}`}>
                  {getStatusColor(selectedItem.status).icon}
                  {selectedItem.status.replace(/_/g, " ")}
                </span>
                <span className="text-sm text-gray-400">
                  {formatDate(selectedItem.created_at)}
                </span>
              </div>

              {/* Details based on type */}
              {selectedItem.type === "gift_card" && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Amount</span>
                    <span className="text-sm font-semibold text-gray-900">
                      ₦{selectedItem.amount?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Recipient</span>
                    <span className="text-sm text-gray-900">{selectedItem.recipient_name}</span>
                  </div>
                </div>
              )}

              {selectedItem.type === "complaint" && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {selectedItem.message}
                  </p>
                </div>
              )}

              {selectedItem.type === "consultation" && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Concern</span>
                    <span className="text-sm text-gray-900 capitalize">{selectedItem.concern_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Preferred Date</span>
                    <span className="text-sm text-gray-900">
                      {new Date(selectedItem.preferred_date || "").toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Preferred Time</span>
                    <span className="text-sm text-gray-900">{selectedItem.preferred_time}</span>
                  </div>
                </div>
              )}

              {/* Replies */}
              {selectedItem.replies && selectedItem.replies.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Responses</h3>
                  <div className="space-y-3">
                    {selectedItem.replies.map((reply) => (
                      <div key={reply.id} className="bg-[#7B2D8E]/5 border border-[#7B2D8E]/10 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-[#7B2D8E]">
                            {reply.responder_name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(reply.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                          {reply.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress indicator */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Progress</h3>
                <div className="relative">
                  <div className="flex items-center justify-between">
                    {["Submitted", "In Review", "Responded"].map((step, idx) => {
                      const isCompleted = (
                        (idx === 0) ||
                        (idx === 1 && ["in_progress", "approved", "confirmed", "resolved", "completed", "rejected", "cancelled"].includes(selectedItem.status)) ||
                        (idx === 2 && ["approved", "confirmed", "resolved", "completed", "rejected", "cancelled"].includes(selectedItem.status))
                      )
                      return (
                        <div key={step} className="flex flex-col items-center flex-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isCompleted ? "bg-[#7B2D8E] text-white" : "bg-gray-100 text-gray-400"
                          }`}>
                            {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs">{idx + 1}</span>}
                          </div>
                          <span className={`text-xs mt-2 ${isCompleted ? "text-[#7B2D8E] font-medium" : "text-gray-400"}`}>
                            {step}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="absolute top-4 left-[16%] right-[16%] h-0.5 bg-gray-200 -z-10">
                    <div 
                      className="h-full bg-[#7B2D8E] transition-all"
                      style={{ 
                        width: ["in_progress"].includes(selectedItem.status) ? "50%" : 
                               ["approved", "confirmed", "resolved", "completed", "rejected", "cancelled"].includes(selectedItem.status) ? "100%" : "0%" 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
