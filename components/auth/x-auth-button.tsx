'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { formatXError, sanitizeRedirectPath } from '@/lib/x-oauth'

interface XAuthButtonProps {
  mode: 'signin' | 'signup'
  redirectTo?: string
  onError: (message: string) => void
}

interface XCompletionPayload {
  type?: string
  status?: 'pending' | 'success' | 'error' | 'expired'
  handoff?: string
  redirectTo?: string
  error?: string
  reason?: string
  detail?: string
}

export function XAuthButton({
  mode,
  redirectTo = '/dashboard',
  onError,
}: XAuthButtonProps) {
  const [loading, setLoading] = useState(false)
  const popupRef = useRef<Window | null>(null)
  const statusPollRef = useRef<number | null>(null)
  const completingRef = useRef(false)
  const activePollTokenRef = useRef<string | null>(null)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  const stopPolling = useCallback(() => {
    if (statusPollRef.current !== null) {
      window.clearInterval(statusPollRef.current)
      statusPollRef.current = null
    }
    activePollTokenRef.current = null
  }, [])

  const closePopup = useCallback(() => {
    try {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close()
      }
    } catch {
      /* ignore cross-origin COOP restriction */
    }
    popupRef.current = null
  }, [])

  const handleSuccess = useCallback(
    async (data: XCompletionPayload) => {
      if (completingRef.current) return
      completingRef.current = true
      stopPolling()
      closePopup()

      let finalRedirect = sanitizeRedirectPath(redirectTo)
      try {
        if (data.redirectTo) {
          const parsed = new URL(data.redirectTo, window.location.origin)
          finalRedirect = sanitizeRedirectPath(
            `${parsed.pathname}${parsed.search}${parsed.hash}`,
            finalRedirect,
          )
        }
      } catch {
        /* keep fallback */
      }

      if (data.handoff) {
        try {
          const res = await fetch('/api/auth/x/handoff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ handoff: data.handoff }),
          })
          if (res.ok) {
            const json = (await res.json()) as { redirectTo?: string }
            if (json.redirectTo) {
              finalRedirect = sanitizeRedirectPath(json.redirectTo, finalRedirect)
            }
          }
        } catch {
          /* fall back to navigating — popup may already have set the cookie */
        }
      }

      window.dispatchEvent(new Event('user-updated'))
      window.location.replace(finalRedirect)
    },
    [closePopup, redirectTo, stopPolling],
  )

  const handleFailure = useCallback(
    (data: XCompletionPayload) => {
      if (completingRef.current) return
      completingRef.current = false
      stopPolling()
      closePopup()
      setLoading(false)
      onErrorRef.current(formatXError(data.error, data.reason, data.detail))
    },
    [closePopup, stopPolling],
  )

  useEffect(() => {
    const handleEvent = (data: XCompletionPayload | undefined) => {
      if (!data) return
      if (data.type === 'X_OAUTH_ERROR' || data.status === 'error') {
        handleFailure(data)
        return
      }
      if (data.type === 'X_OAUTH_SUCCESS' || data.status === 'success') {
        void handleSuccess(data)
      }
    }

    const onWindowMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return
      }
      handleEvent(event.data as XCompletionPayload | undefined)
    }

    window.addEventListener('message', onWindowMessage)

    let channel: BroadcastChannel | null = null
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('dermaspace_x_oauth')
        channel.onmessage = (event) => {
          handleEvent(event.data as XCompletionPayload | undefined)
        }
      }
    } catch {
      /* BroadcastChannel unavailable */
    }

    return () => {
      window.removeEventListener('message', onWindowMessage)
      try {
        channel?.close()
      } catch {
        /* ignore */
      }
      stopPolling()
    }
  }, [handleFailure, handleSuccess, stopPolling])

  const handleCancel = () => {
    completingRef.current = false
    stopPolling()
    closePopup()
    setLoading(false)
  }

  const handleClick = async () => {
    if (loading) return
    onErrorRef.current('')
    setLoading(true)
    completingRef.current = false
    stopPolling()

    // Open a blank popup synchronously inside the click handler so
    // popup blockers do not reject it while we fetch the X URL.
    const popup = window.open(
      'about:blank',
      'x_oauth_popup',
      'width=600,height=720,menubar=no,toolbar=no,status=no',
    )

    if (!popup) {
      setLoading(false)
      onErrorRef.current('Please allow popups for this site to continue with X.')
      return
    }

    popupRef.current = popup

    try {
      const qs = new URLSearchParams({
        format: 'json',
        redirect: redirectTo,
      })
      const res = await fetch(`/api/auth/x?${qs.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      const data = (await res.json().catch(() => ({}))) as {
        url?: string
        pollToken?: string
        message?: string
      }

      if (!res.ok || !data.url) {
        closePopup()
        setLoading(false)
        onErrorRef.current(
          data.message || "X sign-in isn't available right now. Please try another method.",
        )
        return
      }

      popup.location.href = data.url

      if (data.pollToken) {
        const pollToken = data.pollToken
        activePollTokenRef.current = pollToken
        statusPollRef.current = window.setInterval(async () => {
          if (activePollTokenRef.current !== pollToken || completingRef.current) {
            return
          }
          try {
            const statusRes = await fetch('/api/auth/x/status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              cache: 'no-store',
              body: JSON.stringify({ token: pollToken }),
            })
            if (!statusRes.ok) return
            const payload = (await statusRes.json()) as XCompletionPayload
            if (payload.status === 'success') {
              await handleSuccess(payload)
            } else if (payload.status === 'error') {
              handleFailure(payload)
            } else if (payload.status === 'expired') {
              stopPolling()
              setLoading(false)
            }
          } catch {
            /* transient network blip — keep polling */
          }
        }, 750)
      }
    } catch {
      closePopup()
      setLoading(false)
      onErrorRef.current('Network error starting X sign-in. Please try again.')
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-busy={loading}
        className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-700" />
        ) : (
          <svg
            className="w-5 h-5 text-gray-900"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
          </svg>
        )}
        {loading
          ? 'Waiting for X…'
          : mode === 'signup'
            ? 'Sign up with X'
            : 'Sign in with X'}
      </button>
      {loading && (
        <div className="mt-1.5 text-center">
          <button
            type="button"
            onClick={handleCancel}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 underline underline-offset-2"
          >
            Cancel X sign-in
          </button>
        </div>
      )}
    </div>
  )
}
