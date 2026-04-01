'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, X, Fingerprint, Smartphone } from 'lucide-react'

interface SecurityStatus {
  hasPasskey: boolean
  has2FA: boolean
}

export function SecurityReminder() {
  const [status, setStatus] = useState<SecurityStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user has dismissed the reminder in this session
    const isDismissed = sessionStorage.getItem('security-reminder-dismissed')
    if (isDismissed === 'true') {
      setDismissed(true)
      setLoading(false)
      return
    }

    const checkSecurityStatus = async () => {
      try {
        const [passkeysRes, twoFARes] = await Promise.all([
          fetch('/api/auth/passkey/list'),
          fetch('/api/auth/2fa/status')
        ])

        const passkeysData = passkeysRes.ok ? await passkeysRes.json() : { passkeys: [] }
        const twoFAData = twoFARes.ok ? await twoFARes.json() : { isEnabled: false }

        setStatus({
          hasPasskey: passkeysData.passkeys?.length > 0,
          has2FA: twoFAData.isEnabled
        })
      } catch {
        // If we can't check, don't show the reminder
        setDismissed(true)
      } finally {
        setLoading(false)
      }
    }

    checkSecurityStatus()
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('security-reminder-dismissed', 'true')
  }

  // Don't show while loading or if dismissed
  if (loading || dismissed) return null

  // Don't show if user already has both security features set up
  if (status?.hasPasskey && status?.has2FA) return null

  // Don't show if both are set up
  if (!status) return null

  const missingFeatures: string[] = []
  if (!status.hasPasskey) missingFeatures.push('passkey')
  if (!status.has2FA) missingFeatures.push('two-factor authentication')

  return (
    <div className="bg-[#7B2D8E]/5 border border-[#7B2D8E]/20 rounded-2xl p-4 mb-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-[#7B2D8E]" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Strengthen Your Account Security
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {missingFeatures.length === 2 
              ? 'Add a passkey and enable two-factor authentication for better protection.'
              : `Set up ${missingFeatures[0]} to enhance your account security.`
            }
          </p>
          
          <div className="flex flex-wrap gap-2">
            {!status.hasPasskey && (
              <Link
                href="/dashboard/settings?section=security&action=passkey"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7B2D8E] text-white text-xs font-medium rounded-lg hover:bg-[#6B2278] transition-colors"
              >
                <Fingerprint className="w-3.5 h-3.5" />
                Add Passkey
              </Link>
            )}
            {!status.has2FA && (
              <Link
                href="/dashboard/settings?section=security&action=2fa"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7B2D8E] text-white text-xs font-medium rounded-lg hover:bg-[#6B2278] transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Enable 2FA
              </Link>
            )}
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
