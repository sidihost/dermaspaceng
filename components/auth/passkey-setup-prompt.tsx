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
      // Removed `console.log('[v0] Verify response:', ..., verifyData)`:
      // `verifyData` echoes server fields that can include the user's
      // ID / email / credential metadata. Even though
      // compiler.removeConsole strips it in prod, leaving it in the
      // source tree means it would briefly appear in any preview /
      // staging build where NODE_ENV !== 'production'. The verify
      // result is already surfaced via the user-facing error path
      // below.
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
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md px-6 pt-5 pb-8 sm:pb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
            alt="Dermaspace"
            className="mx-auto h-6 w-auto mb-5"
          />
          <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6 text-[#7B2D8E]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Passkey added</h2>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            You can now sign in with your fingerprint or face.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[60]">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md px-6 pt-5 pb-8 sm:pb-5 relative">
        {showSkip && (
          <button
            onClick={onSkip}
            aria-label="Close"
            className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Brand wordmark — keeps the modal visually anchored to the
            rest of the signup wizard (which shows the same logo in
            its header) instead of feeling like an unrelated dialog. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
          alt="Dermaspace"
          className="mx-auto h-6 w-auto mb-4"
        />

        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-3">
            <Fingerprint className="w-6 h-6 text-[#7B2D8E]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1 tracking-tight">Set up a passkey</h2>
          <p className="text-gray-600 text-[13px] leading-relaxed">
            Sign in faster with your fingerprint, face, or screen lock.
          </p>
        </div>

        {step === 'error' && (
          <div className="mb-3 px-3 py-2 bg-[#7B2D8E]/5 border border-[#7B2D8E]/20 rounded-lg text-[12px] text-[#7B2D8E]">
            {error}
          </div>
        )}

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg">
            <Shield className="w-4 h-4 text-[#7B2D8E] shrink-0" />
            <p className="text-[12px] text-gray-700">
              <span className="font-semibold text-gray-900">Phishing-resistant</span>{' '}
              <span className="text-gray-500">— safer than passwords</span>
            </p>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg">
            <Fingerprint className="w-4 h-4 text-[#7B2D8E] shrink-0" />
            <p className="text-[12px] text-gray-700">
              <span className="font-semibold text-gray-900">One-tap sign in</span>{' '}
              <span className="text-gray-500">— Face ID, Touch ID, Windows Hello</span>
            </p>
          </div>
        </div>

        {step === 'intro' && (
          <div className="mb-3">
            <input
              type="text"
              value={passkeyName}
              onChange={(e) => setPasskeyName(e.target.value)}
              placeholder="Device name (optional) — e.g. iPhone"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
            />
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={handleSetupPasskey}
            disabled={step === 'registering'}
            className="w-full py-2.5 bg-[#7B2D8E] text-white text-[13px] font-semibold rounded-lg hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {step === 'registering' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Setting up passkey...
              </>
            ) : step === 'error' ? (
              'Try again'
            ) : (
              <>
                Set up passkey
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {showSkip && (
            <button
              onClick={onSkip}
              className="w-full py-2 text-gray-600 text-[13px] font-medium hover:text-gray-800 transition-colors"
            >
              Skip for now
            </button>
          )}
        </div>

        <p className="mt-3 text-[11px] text-center text-gray-500">
          You can always set this up later in account settings.
        </p>
      </div>
    </div>
  )
}
