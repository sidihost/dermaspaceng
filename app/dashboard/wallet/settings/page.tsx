'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { 
  ArrowLeft, 
  Wallet, 
  Bell, 
  Target, 
  RefreshCw,
  Save,
  Loader2,
  CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

interface WalletSettings {
  monthly_budget: number | null
  budget_alert_threshold: number
  low_balance_alert: number
  email_notifications: boolean
  push_notifications: boolean
  auto_reload_enabled: boolean
  auto_reload_amount: number | null
  auto_reload_threshold: number | null
}

export default function WalletSettingsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState<WalletSettings>({
    monthly_budget: null,
    budget_alert_threshold: 80,
    low_balance_alert: 1000,
    email_notifications: true,
    push_notifications: false,
    auto_reload_enabled: false,
    auto_reload_amount: null,
    auto_reload_threshold: null,
  })

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/wallet/settings')
        if (res.ok) {
          const data = await res.json()
          setSettings(data.settings)
        } else if (res.status === 401) {
          router.push('/signin')
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchSettings()
  }, [router])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/wallet/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <Header />
      
      <div className="py-6 md:py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link 
              href="/dashboard/wallet"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-background border border-border hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground">Wallet Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your wallet preferences</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Budget Settings */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-background border border-border p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Budget Control</h2>
                  <p className="text-sm text-muted-foreground">Set spending limits</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Monthly Budget
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">N</span>
                    <Input
                      type="number"
                      value={settings.monthly_budget || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        monthly_budget: e.target.value ? parseInt(e.target.value) : null
                      })}
                      className="pl-8"
                      placeholder="No limit set"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty for no budget limit
                  </p>
                </div>
                
                {settings.monthly_budget && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-foreground">
                        Alert Threshold
                      </label>
                      <span className="text-sm text-primary font-medium">
                        {settings.budget_alert_threshold}%
                      </span>
                    </div>
                    <Slider
                      value={[settings.budget_alert_threshold]}
                      onValueChange={([value]) => setSettings({
                        ...settings,
                        budget_alert_threshold: value
                      })}
                      min={50}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Get notified when you reach {settings.budget_alert_threshold}% of your budget
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Low Balance Alert */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl bg-background border border-border p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                  <Wallet className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Low Balance Alert</h2>
                  <p className="text-sm text-muted-foreground">Get notified when balance is low</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Alert when balance falls below
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">N</span>
                  <Input
                    type="number"
                    value={settings.low_balance_alert}
                    onChange={(e) => setSettings({
                      ...settings,
                      low_balance_alert: parseInt(e.target.value) || 0
                    })}
                    className="pl-8"
                  />
                </div>
              </div>
            </motion.div>

            {/* Auto Reload */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl bg-background border border-border p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <RefreshCw className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">Auto Reload</h2>
                    <p className="text-sm text-muted-foreground">Automatically top up your wallet</p>
                  </div>
                </div>
                <Switch
                  checked={settings.auto_reload_enabled}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    auto_reload_enabled: checked
                  })}
                />
              </div>
              
              {settings.auto_reload_enabled && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Reload Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">N</span>
                      <Input
                        type="number"
                        value={settings.auto_reload_amount || ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          auto_reload_amount: e.target.value ? parseInt(e.target.value) : null
                        })}
                        className="pl-8"
                        placeholder="10000"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      When balance falls below
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">N</span>
                      <Input
                        type="number"
                        value={settings.auto_reload_threshold || ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          auto_reload_threshold: e.target.value ? parseInt(e.target.value) : null
                        })}
                        className="pl-8"
                        placeholder="1000"
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    Note: Auto reload requires a saved payment method. You will be charged automatically when your balance falls below the threshold.
                  </p>
                </div>
              )}
            </motion.div>

            {/* Notifications */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl bg-background border border-border p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Bell className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Notifications</h2>
                  <p className="text-sm text-muted-foreground">Choose how you want to be notified</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive alerts via email</p>
                  </div>
                  <Switch
                    checked={settings.email_notifications}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      email_notifications: checked
                    })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Push Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive browser notifications</p>
                  </div>
                  <Switch
                    checked={settings.push_notifications}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      push_notifications: checked
                    })}
                  />
                </div>
              </div>
            </motion.div>

            {/* Save Button */}
            <div className="flex justify-end gap-3 pt-4">
              <Link href="/dashboard/wallet">
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className={cn(
                  'gap-2',
                  saved && 'bg-green-600 hover:bg-green-600'
                )}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </main>
  )
}
