"use client"

import { useState } from "react"
import { 
  Settings, 
  Bell, 
  Mail, 
  Shield, 
  Database, 
  Globe,
  Save,
  Check,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export default function AdminSettingsPage() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [newUserAlerts, setNewUserAlerts] = useState(true)
  const [complaintAlerts, setComplaintAlerts] = useState(true)
  const [giftCardAlerts, setGiftCardAlerts] = useState(true)
  const [consultationAlerts, setConsultationAlerts] = useState(true)

  // Email settings
  const [supportEmail, setSupportEmail] = useState("support@dermaspaceng.com")
  const [notificationEmail, setNotificationEmail] = useState("notifications@dermaspaceng.com")
  const [emailSignature, setEmailSignature] = useState("Best regards,\nThe Dermaspace Team")

  const handleSave = async () => {
    setSaving(true)
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your application preferences and configurations</p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0] hover:from-[#6B1D7E] hover:to-[#8B3DA0] text-white shadow-lg shadow-[#7B2D8E]/25"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="bg-gray-100/80 p-1 rounded-xl flex-wrap h-auto gap-1">
          <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-0 shadow-lg shadow-gray-100">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <div>
                  <span className="text-lg">Notification Preferences</span>
                  <CardDescription className="mt-0.5">Choose when and how you receive notifications</CardDescription>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">Email Notifications</Label>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
                <Switch 
                  checked={emailNotifications} 
                  onCheckedChange={setEmailNotifications}
                  className="data-[state=checked]:bg-[#7B2D8E]"
                />
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Alert Types</h4>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-[#7B2D8E]/30 transition-colors">
                    <div className="space-y-0.5">
                      <Label className="font-medium">New User Registrations</Label>
                      <p className="text-xs text-gray-500">When someone creates an account</p>
                    </div>
                    <Switch 
                      checked={newUserAlerts} 
                      onCheckedChange={setNewUserAlerts}
                      className="data-[state=checked]:bg-[#7B2D8E]"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-[#7B2D8E]/30 transition-colors">
                    <div className="space-y-0.5">
                      <Label className="font-medium">New Complaints</Label>
                      <p className="text-xs text-gray-500">When a complaint is submitted</p>
                    </div>
                    <Switch 
                      checked={complaintAlerts} 
                      onCheckedChange={setComplaintAlerts}
                      className="data-[state=checked]:bg-[#7B2D8E]"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-[#7B2D8E]/30 transition-colors">
                    <div className="space-y-0.5">
                      <Label className="font-medium">Gift Card Requests</Label>
                      <p className="text-xs text-gray-500">When someone requests a gift card</p>
                    </div>
                    <Switch 
                      checked={giftCardAlerts} 
                      onCheckedChange={setGiftCardAlerts}
                      className="data-[state=checked]:bg-[#7B2D8E]"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-[#7B2D8E]/30 transition-colors">
                    <div className="space-y-0.5">
                      <Label className="font-medium">Consultation Bookings</Label>
                      <p className="text-xs text-gray-500">When someone books a consultation</p>
                    </div>
                    <Switch 
                      checked={consultationAlerts} 
                      onCheckedChange={setConsultationAlerts}
                      className="data-[state=checked]:bg-[#7B2D8E]"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-6">
          <Card className="border-0 shadow-lg shadow-gray-100">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <span className="text-lg">Email Configuration</span>
                  <CardDescription className="mt-0.5">Configure your email settings and templates</CardDescription>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="support-email">Support Email</Label>
                  <Input 
                    id="support-email" 
                    type="email" 
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                  <p className="text-xs text-gray-500">Used for customer support inquiries</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notification-email">Notification Email</Label>
                  <Input 
                    id="notification-email" 
                    type="email" 
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                  <p className="text-xs text-gray-500">Sender email for notifications</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-signature">Email Signature</Label>
                <Textarea 
                  id="email-signature" 
                  rows={4}
                  value={emailSignature}
                  onChange={(e) => setEmailSignature(e.target.value)}
                  className="rounded-xl resize-none"
                />
                <p className="text-xs text-gray-500">Appended to all outgoing emails</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-0 shadow-lg shadow-gray-100">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <span className="text-lg">Security Settings</span>
                  <CardDescription className="mt-0.5">Manage security and access controls</CardDescription>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-500">Require 2FA for admin accounts</p>
                </div>
                <Switch className="data-[state=checked]:bg-[#7B2D8E]" />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">Session Timeout</Label>
                  <p className="text-sm text-gray-500">Auto-logout after inactivity</p>
                </div>
                <Switch defaultChecked className="data-[state=checked]:bg-[#7B2D8E]" />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">Login Notifications</Label>
                  <p className="text-sm text-gray-500">Email alerts for new logins</p>
                </div>
                <Switch defaultChecked className="data-[state=checked]:bg-[#7B2D8E]" />
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <h4 className="font-semibold text-amber-800 mb-2">Password Requirements</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>- Minimum 8 characters</li>
                  <li>- At least one uppercase letter</li>
                  <li>- At least one number</li>
                  <li>- At least one special character</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card className="border-0 shadow-lg shadow-gray-100">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Database className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <span className="text-lg">System Information</span>
                  <CardDescription className="mt-0.5">View system status and information</CardDescription>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium text-green-700">Database</span>
                  </div>
                  <p className="text-2xl font-bold text-green-800">Connected</p>
                  <p className="text-xs text-green-600 mt-1">Neon PostgreSQL</p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">API Status</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-800">Operational</p>
                  <p className="text-xs text-blue-600 mt-1">All systems normal</p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">Version</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-800">1.0.0</p>
                  <p className="text-xs text-purple-600 mt-1">Latest release</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3">Environment Variables</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">DATABASE_URL</span>
                    <span className="font-mono text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Configured</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">RESEND_API_KEY</span>
                    <span className="font-mono text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Configured</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600">NEXT_PUBLIC_APP_URL</span>
                    <span className="font-mono text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Configured</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
