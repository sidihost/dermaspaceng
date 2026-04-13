'use client'

import { useState } from 'react'
import { Fingerprint, X, Shield, ArrowRight, Check, Loader2 } from 'lucide-react'
import { startRegistration } from '@simplewebauthn/browser'

interface PasskeySetupPromptProps {
  onComplete: () => void
  onSkip: () => void
  showSkip?: boolean
}

export function PasskeySetupPrompt({ onComplete, onSkip, showSkip = true }: PasskeySetupPromptProps) {
  const [step, setStep] = useState<'intro' | 'registering' | 'success' | 'error'>('intro')
  const [error, setError] = useState('')
  const [passkeyName, setPasskeyName] = useState('')

  const handleSetupPasskey = async () => {
    setStep('registering')
    setError('')

    try {
      console.log('[v0] Starting passkey registration...')
      
      // Get registration options from server
      const optionsRes = await fetch('/api/auth/passkey/register/options', {
        method: 'POST'
      })

      if (!optionsRes.ok) {
        const errorData = await optionsRes.json().catch(() => ({}))
        console.error('[v0] Failed to get options:', errorData)
        throw new Error(errorData.error || 'Failed to get registration options')
      }

      const options = await optionsRes.json()
      console.log('[v0] Got registration options:', options.rp)

      // Start WebAuthn registration
      const credential = await startRegistration({ optionsJSON: options })
      console.log('[v0] WebAuthn registration completed, verifying...')

      // Verify with server
      const verifyRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential,
          name: passkeyName || 'My Passkey'
        })
      })

      const verifyData = await verifyRes.json()
      console.log('[v0] Verify response:', verifyRes.status, verifyData)
      
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Failed to verify passkey')
      }

      setStep('success')
      setTimeout(() => {
        onComplete()
      }, 2000)
    } catch (err) {
      console.error('[v0] Passkey setup error:', err)
      setStep('error')
      
      // Handle WebAuthn-specific errors
      let errorMessage = 'Failed to set up passkey'
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Passkey setup was cancelled or not allowed. Please try again.'
        } else if (err.name === 'NotSupportedError') {
          errorMessage = 'Your device does not support passkeys.'
        } else if (err.name === 'SecurityError') {
          errorMessage = 'Security error. Please ensure you are using HTTPS.'
        } else if (err.name === 'InvalidStateError') {
          errorMessage = 'A passkey for this device already exists.'
        } else {
          errorMessage = err.message
        }
      }
      setError(errorMessage)
    }
  }

  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[60]">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-8 pb-24 sm:pb-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-[#7B2D8E]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Passkey Added</h2>
          <p className="text-gray-600">
            Your passkey has been set up successfully. You can now sign in with your fingerprint or face.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[60]">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 pb-24 sm:pb-6 relative">
        {showSkip && (
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-4">
            <Fingerprint className="w-8 h-8 text-[#7B2D8E]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Set Up a Passkey</h2>
          <p className="text-gray-600 text-sm">
            Sign in faster and more securely with your fingerprint, face, or screen lock.
          </p>
        </div>

        {step === 'error' && (
          <div className="mb-4 p-4 bg-[#7B2D8E]/5 border border-[#7B2D8E]/20 rounded-xl text-sm text-[#7B2D8E]">
            {error}
          </div>
        )}

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <Shield className="w-5 h-5 text-[#7B2D8E] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">More secure than passwords</p>
              <p className="text-xs text-gray-500">Passkeys are resistant to phishing attacks</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <Fingerprint className="w-5 h-5 text-[#7B2D8E] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">Fast and convenient</p>
              <p className="text-xs text-gray-500">Use Face ID, Touch ID, or Windows Hello</p>
            </div>
          </div>
        </div>

        {step === 'intro' && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Passkey Name (optional)
            </label>
            <input
              type="text"
              value={passkeyName}
              onChange={(e) => setPasskeyName(e.target.value)}
              placeholder="e.g., MacBook Pro, iPhone"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
            />
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleSetupPasskey}
            disabled={step === 'registering'}
            className="w-full py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {step === 'registering' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Setting up passkey...
              </>
            ) : step === 'error' ? (
              'Try Again'
            ) : (
              <>
                Set Up Passkey
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {showSkip && (
            <button
              onClick={onSkip}
              className="w-full py-3 text-gray-600 text-sm font-medium hover:text-gray-800 transition-colors"
            >
              Skip for now
            </button>
          )}
        </div>

        <p className="mt-4 text-xs text-center text-gray-500">
          You can always set up a passkey later in your account settings.
        </p>
      </div>
    </div>
  )
}
