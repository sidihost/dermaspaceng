'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { 
  ArrowLeft, User, Lock, Wallet, Bell, Shield, Eye, EyeOff,
  Check, AlertCircle, ChevronRight, CreditCard, Target, Mail
} from 'lucide-react'

interface UserData {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface WalletSettings {
  monthly_budget: number | null
  budget_alert_threshold: number
  low_balance_alert: number
  email_notifications: boolean
  push_notifications: boolean
  transaction_alerts: boolean
  budget_alerts: boolean
  promotional_emails: boolean
}

interface WalletData {
  balance: number
  currency: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<UserData | null>(null)
  const [activeSection, setActiveSection] = useState<'account' | 'security' | 'wallet' | 'notifications'>('account')
  
  // Password state
  const [hasPassword, setHasPassword] = useState(true)
  const [authProvider, setAuthProvider] = useState('email')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Wallet settings state
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [walletSettings, setWalletSettings] = useState<WalletSettings>({
    monthly_budget: null,
    budget_alert_threshold: 80,
    low_balance_alert: 5000,
    email_notifications: true,
    push_notifications: true,
    transaction_alerts: true,
    budget_alerts: true,
    promotional_emails: false
  })
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        // Check auth
        const authRes = await fetch('/api/auth/me')
        if (!authRes.ok) {
          router.push('/signin')
          return
        }
        const authData = await authRes.json()
        setUser(authData.user)

        // Check password status
        const passRes = await fetch('/api/auth/password')
        if (passRes.ok) {
          const passData = await passRes.json()
          setHasPassword(passData.hasPassword)
          setAuthProvider(passData.authProvider)
        }

        // Fetch wallet and settings
        const [walletRes, settingsRes] = await Promise.all([
          fetch('/api/wallet'),
          fetch('/api/wallet/settings')
        ])

        if (walletRes.ok) {
          const walletData = await walletRes.json()
          setWallet(walletData)
        }

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json()
          setWalletSettings(prev => ({ ...prev, ...settingsData }))
        }
      } catch {
        router.push('/signin')
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [router])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters' })
      return
    }

    setPasswordLoading(true)
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: hasPassword ? currentPassword : undefined,
          newPassword,
          isSettingPassword: !hasPassword
        })
      })

      const data = await res.json()

      if (res.ok) {
        setPasswordMessage({ type: 'success', text: data.message })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setHasPassword(true)
      } else {
        setPasswordMessage({ type: 'error', text: data.error })
      }
    } catch {
      setPasswordMessage({ type: 'error', text: 'Failed to update password' })
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleWalletSettingsSave = async () => {
    setSettingsLoading(true)
    setSettingsMessage(null)

    try {
      const res = await fetch('/api/wallet/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(walletSettings)
      })

      if (res.ok) {
        setSettingsMessage({ type: 'success', text: 'Settings saved successfully' })
      } else {
        const data = await res.json()
        setSettingsMessage({ type: 'error', text: data.error || 'Failed to save settings' })
      }
    } catch {
      setSettingsMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSettingsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  const sections = [
    { id: 'account', label: 'Account', icon: User, description: 'Your profile information' },
    { id: 'security', label: 'Security', icon: Lock, description: 'Password and authentication' },
    { id: 'wallet', label: 'Wallet', icon: Wallet, description: 'Budget and payment settings' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Email and alert preferences' },
  ] as const

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="py-6 md:py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/dashboard"
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-500">Manage your account and preferences</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <div className="lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-gray-200 p-2">
                <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors whitespace-nowrap flex-shrink-0 w-full ${
                        activeSection === section.id
                          ? 'bg-[#7B2D8E] text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <section.icon className="w-5 h-5 flex-shrink-0" />
                      <div className="hidden lg:block">
                        <p className="text-sm font-medium">{section.label}</p>
                        <p className={`text-xs ${activeSection === section.id ? 'text-white/70' : 'text-gray-400'}`}>
                          {section.description}
                        </p>
                      </div>
                      <span className="lg:hidden text-sm font-medium">{section.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Account Section */}
              {activeSection === 'account' && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Account Information</h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-[#7B2D8E] flex items-center justify-center text-white text-xl font-semibold">
                        {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                        <p className="text-sm text-gray-500">{user?.email}</p>
                        {authProvider === 'google' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full mt-1">
                            <svg className="w-3 h-3" viewBox="0 0 24 24">
                              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Google Account
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                      <div className="grid gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                          <input
                            type="text"
                            value={user?.firstName || ''}
                            disabled
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                          <input
                            type="text"
                            value={user?.lastName || ''}
                            disabled
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                          <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-3">
                        Contact support to update your account information
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Section */}
              {activeSection === 'security' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-[#7B2D8E]" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {hasPassword ? 'Change Password' : 'Set Password'}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {hasPassword 
                            ? 'Update your password to keep your account secure'
                            : 'Set a password to log in with email and password'
                          }
                        </p>
                      </div>
                    </div>

                    {!hasPassword && authProvider === 'google' && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-blue-900">Google Account Connected</p>
                            <p className="text-sm text-blue-700 mt-1">
                              You signed up with Google. Set a password to also be able to log in with your email and password.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {passwordMessage && (
                      <div className={`rounded-xl p-4 mb-6 ${
                        passwordMessage.type === 'success' 
                          ? 'bg-green-50 border border-green-100' 
                          : 'bg-red-50 border border-red-100'
                      }`}>
                        <div className="flex items-center gap-2">
                          {passwordMessage.type === 'success' 
                            ? <Check className="w-5 h-5 text-green-600" />
                            : <AlertCircle className="w-5 h-5 text-red-600" />
                          }
                          <p className={`text-sm font-medium ${
                            passwordMessage.type === 'success' ? 'text-green-900' : 'text-red-900'
                          }`}>
                            {passwordMessage.text}
                          </p>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      {hasPassword && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Current Password
                          </label>
                          <div className="relative">
                            <input
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] outline-none transition-colors pr-12"
                              placeholder="Enter current password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                            >
                              {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] outline-none transition-colors pr-12"
                            placeholder="Enter new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                          >
                            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Must be at least 8 characters</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] outline-none transition-colors"
                          placeholder="Confirm new password"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={passwordLoading || !newPassword || !confirmPassword || (hasPassword && !currentPassword)}
                        className="w-full py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {passwordLoading ? 'Saving...' : hasPassword ? 'Update Password' : 'Set Password'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Wallet Section */}
              {activeSection === 'wallet' && (
                <div className="space-y-6">
                  {/* Wallet Overview Card */}
                  <div className="bg-gradient-to-br from-[#7B2D8E] to-[#5B1D6E] rounded-2xl p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                          <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm text-white/70">Wallet Balance</p>
                          <p className="text-2xl font-bold">{wallet ? formatCurrency(wallet.balance) : '---'}</p>
                        </div>
                      </div>
                      <Link
                        href="/dashboard/wallet"
                        className="flex items-center gap-1 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors"
                      >
                        View Wallet
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>

                  {/* Budget Settings */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                        <Target className="w-5 h-5 text-[#7B2D8E]" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Budget Settings</h2>
                        <p className="text-sm text-gray-500">Set spending limits and alerts</p>
                      </div>
                    </div>

                    {settingsMessage && (
                      <div className={`rounded-xl p-4 mb-6 ${
                        settingsMessage.type === 'success' 
                          ? 'bg-green-50 border border-green-100' 
                          : 'bg-red-50 border border-red-100'
                      }`}>
                        <div className="flex items-center gap-2">
                          {settingsMessage.type === 'success' 
                            ? <Check className="w-5 h-5 text-green-600" />
                            : <AlertCircle className="w-5 h-5 text-red-600" />
                          }
                          <p className={`text-sm font-medium ${
                            settingsMessage.type === 'success' ? 'text-green-900' : 'text-red-900'
                          }`}>
                            {settingsMessage.text}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Monthly Budget (Optional)
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₦</span>
                          <input
                            type="number"
                            value={walletSettings.monthly_budget || ''}
                            onChange={(e) => setWalletSettings(prev => ({ 
                              ...prev, 
                              monthly_budget: e.target.value ? Number(e.target.value) : null 
                            }))}
                            className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] outline-none transition-colors"
                            placeholder="e.g. 100000"
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Leave empty for no budget limit</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Budget Alert Threshold: {walletSettings.budget_alert_threshold}%
                        </label>
                        <input
                          type="range"
                          min="50"
                          max="100"
                          value={walletSettings.budget_alert_threshold}
                          onChange={(e) => setWalletSettings(prev => ({ 
                            ...prev, 
                            budget_alert_threshold: Number(e.target.value) 
                          }))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#7B2D8E]"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Get notified when you reach this percentage of your monthly budget
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Low Balance Alert
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₦</span>
                          <input
                            type="number"
                            value={walletSettings.low_balance_alert}
                            onChange={(e) => setWalletSettings(prev => ({ 
                              ...prev, 
                              low_balance_alert: Number(e.target.value) 
                            }))}
                            className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] outline-none transition-colors"
                            placeholder="e.g. 5000"
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Get notified when your balance drops below this amount
                        </p>
                      </div>

                      <button
                        onClick={handleWalletSettingsSave}
                        disabled={settingsLoading}
                        className="w-full py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {settingsLoading ? 'Saving...' : 'Save Budget Settings'}
                      </button>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-[#7B2D8E]" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
                        <p className="text-sm text-gray-500">Manage your payment options</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#00C853"/>
                              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#00C853" strokeWidth="2"/>
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Paystack</p>
                            <p className="text-xs text-gray-500">Cards, Bank Transfer, USSD</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-green-50 text-green-600 text-xs font-medium rounded-full">
                          Active
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-[#7B2D8E]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Dermaspace Wallet</p>
                            <p className="text-xs text-gray-500">Balance: {wallet ? formatCurrency(wallet.balance) : '---'}</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-green-50 text-green-600 text-xs font-medium rounded-full">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Section */}
              {activeSection === 'notifications' && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-[#7B2D8E]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
                      <p className="text-sm text-gray-500">Choose what notifications you receive</p>
                    </div>
                  </div>

                  {settingsMessage && (
                    <div className={`rounded-xl p-4 mb-6 ${
                      settingsMessage.type === 'success' 
                        ? 'bg-green-50 border border-green-100' 
                        : 'bg-red-50 border border-red-100'
                    }`}>
                      <div className="flex items-center gap-2">
                        {settingsMessage.type === 'success' 
                          ? <Check className="w-5 h-5 text-green-600" />
                          : <AlertCircle className="w-5 h-5 text-red-600" />
                        }
                        <p className={`text-sm font-medium ${
                          settingsMessage.type === 'success' ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {settingsMessage.text}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {[
                      { key: 'email_notifications', label: 'Email Notifications', description: 'Receive notifications via email' },
                      { key: 'transaction_alerts', label: 'Transaction Alerts', description: 'Get notified for all wallet transactions' },
                      { key: 'budget_alerts', label: 'Budget Alerts', description: 'Receive alerts when approaching budget limits' },
                      { key: 'promotional_emails', label: 'Promotional Emails', description: 'Receive offers and promotional content' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.label}</p>
                          <p className="text-xs text-gray-500">{item.description}</p>
                        </div>
                        <button
                          onClick={() => setWalletSettings(prev => ({ 
                            ...prev, 
                            [item.key]: !prev[item.key as keyof WalletSettings] 
                          }))}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            walletSettings[item.key as keyof WalletSettings] 
                              ? 'bg-[#7B2D8E]' 
                              : 'bg-gray-200'
                          }`}
                        >
                          <span 
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                              walletSettings[item.key as keyof WalletSettings] 
                                ? 'translate-x-7' 
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={handleWalletSettingsSave}
                      disabled={settingsLoading}
                      className="w-full py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
                    >
                      {settingsLoading ? 'Saving...' : 'Save Notification Preferences'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
