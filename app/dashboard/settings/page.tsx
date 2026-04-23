'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { 
  ArrowLeft, User, Wallet, Bell, Eye, EyeOff,
  Check, AlertCircle, ChevronRight, CreditCard, Target,
  Smartphone, Trash2, Plus, Loader2, Copy, RefreshCw,
  Camera, Pencil, X as XIcon, ShieldCheck, KeyRound, ScanFace, LockKeyhole, Info, Globe,
} from 'lucide-react'
import { ButterflyLogo } from '@/components/shared/butterfly-logo'
import { DatePicker } from '@/components/ui/date-picker'
import { startRegistration } from '@simplewebauthn/browser'
import { AvatarPicker } from '@/components/profile/avatar-picker'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface UserData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  avatarUrl?: string
  username?: string
  /** YYYY-MM-DD or null if not set */
  dateOfBirth?: string | null
  // Free-form bio shown on the public profile (500 char cap server-side).
  bio?: string | null
  // Social links — stored as whatever the user typed (handle OR URL);
  // the public profile API normalises these into tappable URLs.
  website?: string | null
  instagram?: string | null
  twitter?: string | null
  tiktok?: string | null
  facebook?: string | null
  linkedin?: string | null
  youtube?: string | null
  // Profile visibility — `true` means /[username] is reachable to
  // the public internet. Stored as `is_public` in the DB; the API
  // normalises the column name to camelCase when it responds.
  isPublic?: boolean
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

function SettingsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<UserData | null>(null)
  const [activeSection, setActiveSection] = useState<'account' | 'security' | 'wallet' | 'notifications' | 'assistant'>('account')
  
  // Handle tab/section parameter from URL and trigger actions
  useEffect(() => {
    const tab = searchParams.get('tab') || searchParams.get('section')
    const action = searchParams.get('action')
    
    if (tab && ['account', 'security', 'wallet', 'notifications'].includes(tab)) {
      setActiveSection(tab as 'account' | 'security' | 'wallet' | 'notifications' | 'assistant')
    }
    
    // Handle specific security actions from security reminder
    if (tab === 'security' || searchParams.get('section') === 'security') {
      setActiveSection('security')
      
      // Auto-trigger passkey setup
      if (action === 'passkey') {
        setTimeout(() => {
          setShowAddPasskey(true)
          setNewPasskeyName('My Passkey')
        }, 500)
      }
      
      // Auto-trigger 2FA setup
      if (action === '2fa') {
        setTimeout(() => {
          setShowSetup2FA(true)
        }, 500)
      }
    }
  }, [searchParams])
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  // YYYY-MM-DD — bound to the <input type="date"> in the profile card.
  const [editDateOfBirth, setEditDateOfBirth] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  // Bio + social handles — populated from /api/auth/profile on mount,
  // kept in local state so the form stays snappy while the user edits,
  // and submitted alongside name/phone in handleProfileUpdate. A single
  // `editSocials` record keeps the JSX terse (one map call to render
  // all seven inputs) and makes it trivial to add another network
  // later without touching more than one state variable.
  const [editBio, setEditBio] = useState('')
  const [editSocials, setEditSocials] = useState({
    website: '',
    instagram: '',
    twitter: '',
    tiktok: '',
    facebook: '',
    linkedin: '',
    youtube: '',
  })
  // Profile visibility — controls whether /[username] is reachable to
  // the wider internet. We default to `true` (match the DB default)
  // and update via a dedicated toggle handler below so the change
  // saves immediately rather than waiting for the "Save" button —
  // this mirrors how iOS / Android handle privacy switches.
  const [isPublic, setIsPublic] = useState(true)
  const [privacyLoading, setPrivacyLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = React.useRef<HTMLInputElement>(null)
  // Spa avatar picker modal — lets the user pick a curated illustration
  // instead of uploading a photo. Saved immediately (no need to enter
  // edit mode first) to mirror how changing an avatar feels on most
  // social apps.
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  
  // Username state
  const [editUsername, setEditUsername] = useState('')
  const [usernameLoading, setUsernameLoading] = useState(false)
  const [usernameMessage, setUsernameMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  
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

  // Passkey state
  const [passkeys, setPasskeys] = useState<Array<{ id: string; name: string; created_at: string; last_used_at: string | null }>>([])
  // Holds the passkey the user is about to delete. Non-null value
  // opens the branded <ConfirmDialog>; clearing it closes the dialog.
  const [passkeyToDelete, setPasskeyToDelete] = useState<{ id: string; name: string } | null>(null)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [passkeyMessage, setPasskeyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showAddPasskey, setShowAddPasskey] = useState(false)
  const [newPasskeyName, setNewPasskeyName] = useState('')

  // Auto-dismiss passkey success message
  useEffect(() => {
    if (passkeyMessage?.type === 'success') {
      const timer = setTimeout(() => setPasskeyMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [passkeyMessage])

  // Auto-dismiss the profile update toast after 3s so the on-brand banner
  // doesn't linger after the save — matches the behaviour of the username
  // toast and the passkey toast above.
  useEffect(() => {
    if (profileMessage) {
      const timer = setTimeout(() => setProfileMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [profileMessage])

  // 2FA state
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [twoFALoading, setTwoFALoading] = useState(false)
  const [twoFAMessage, setTwoFAMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showSetup2FA, setShowSetup2FA] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [totpSecret, setTotpSecret] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0)
  const [disableCode, setDisableCode] = useState('')
  const [showDisable2FA, setShowDisable2FA] = useState(false)
  
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

  // Quiet auto-dismiss for wallet/notification settings saves so the
  // banner doesn't stick around covering the toggle row. (This effect
  // must live BELOW the `settingsMessage` declaration — referencing it
  // in a dep array before `const` initialisation throws a TDZ
  // ReferenceError which killed the entire settings page at render.)
  useEffect(() => {
    if (settingsMessage?.type === 'success') {
      const timer = setTimeout(() => setSettingsMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [settingsMessage])

  // --- Derma AI account-access consent -------------------------------
  // The chat component (components/shared/derma-ai.tsx) reads these flags
  // from localStorage:
  //   - `derma-account-consent` (string 'granted'): master on/off switch.
  //   - `derma-ai-permissions` (JSON): per-capability grants.
  // Exposing these as toggles in settings lets users grant / revoke access
  // up-front instead of waiting for an in-chat modal. `null` = not yet
  // hydrated (first client render only).
  const [aiAccountAccess, setAiAccountAccess] = useState<boolean | null>(null)

  // Granular permissions. Each key controls whether a category of tools
  // should be called by the assistant. Defaults to all-on when the master
  // switch is on (what most users want) but can be narrowed per-category.
  type AiPermissionKey =
    | 'wallet'
    | 'bookings'
    | 'profile'
    | 'support'
    | 'notifications'
    | 'preferences'

  const DEFAULT_AI_PERMISSIONS: Record<AiPermissionKey, boolean> = {
    wallet: true,
    bookings: true,
    profile: true,
    support: true,
    notifications: true,
    preferences: true,
  }

  const [aiPermissions, setAiPermissions] = useState<Record<AiPermissionKey, boolean>>(
    DEFAULT_AI_PERMISSIONS,
  )

  // Hydrate toggles from localStorage on mount. Separate effect keeps SSR
  // clean and prevents a hydration mismatch if the user switches storage.
  useEffect(() => {
    if (typeof window === 'undefined') return
    setAiAccountAccess(localStorage.getItem('derma-account-consent') === 'granted')
    try {
      const raw = localStorage.getItem('derma-ai-permissions')
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Record<AiPermissionKey, boolean>>
        setAiPermissions({ ...DEFAULT_AI_PERMISSIONS, ...parsed })
      }
    } catch {
      /* ignore corrupt */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Disconnecting is a destructive-feeling action (user loses personalised
  // replies, wallet lookups, booking help), so we gate the off-toggle
  // behind an "Are you sure?" brand-coloured modal instead of flipping
  // silently. Connecting stays one-tap because there's nothing to lose.
  const [showAiDisconnectConfirm, setShowAiDisconnectConfirm] = useState(false)

  // Toggle handler for master switch — writes through to localStorage so
  // the assistant picks up the change on the next message. When the user
  // re-enables the master switch we also reset per-capability grants to
  // all-on so they don't end up in a silent "nothing works" state.
  //
  // We also drop a `derma-ai-pending-notice` flag in storage so the next
  // time the chat mounts (or hears the storage event cross-tab) it can
  // slide in a first-class "your account is connected" / "your account
  // has been disconnected" banner in the conversation — the same
  // pattern GitHub / Slack / Notion use when an integration state flips.
  const toggleAiAccountAccess = () => {
    // Turning OFF → always ask for confirmation first.
    if (aiAccountAccess) {
      setShowAiDisconnectConfirm(true)
      return
    }
    // Turning ON → connect immediately and notify the chat.
    try {
      localStorage.setItem('derma-account-consent', 'granted')
      localStorage.setItem(
        'derma-ai-permissions',
        JSON.stringify(DEFAULT_AI_PERMISSIONS),
      )
      localStorage.setItem('derma-ai-pending-notice', 'connected')
    } catch {
      /* swallow — incognito / storage-blocked browsers */
    }
    setAiPermissions(DEFAULT_AI_PERMISSIONS)
    setAiAccountAccess(true)
  }

  // Actually performs the disconnect once the user confirms in the modal.
  const confirmAiDisconnect = () => {
    try {
      localStorage.removeItem('derma-account-consent')
      localStorage.setItem('derma-ai-pending-notice', 'disconnected')
    } catch {
      /* swallow — incognito / storage-blocked browsers */
    }
    setAiAccountAccess(false)
    setShowAiDisconnectConfirm(false)
  }

  // Toggle handler for a single permission category.
  const toggleAiPermission = (key: AiPermissionKey) => {
    setAiPermissions((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem('derma-ai-permissions', JSON.stringify(next))
      } catch {
        /* quota / incognito */
      }
      return next
    })
  }

  // --- Long-term memory viewer -----------------------------------------
  // Read the facts Derma AI has learned about the user (stored by the
  // `saveMemory` tool) so we can show them here and let the user prune
  // individual entries. The chat component hydrates this key; we just
  // mirror it. Writes from this page re-sync to both storage and the
  // global window helper so an open chat picks up changes instantly.
  const [aiMemories, setAiMemories] = useState<string[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hydrate = () => {
      try {
        const raw = localStorage.getItem('derma-ai-memories')
        if (raw) {
          const parsed = JSON.parse(raw) as { memories?: unknown }
          if (Array.isArray(parsed.memories)) {
            setAiMemories(parsed.memories.filter((m): m is string => typeof m === 'string'))
            return
          }
        }
      } catch {
        /* ignore */
      }
      setAiMemories([])
    }
    hydrate()
    // Re-sync when the window regains focus — covers the case where the
    // chat saved a new memory in the background while Settings was open.
    const onFocus = () => hydrate()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const writeAiMemories = (next: string[]) => {
    setAiMemories(next)
    try {
      localStorage.setItem(
        'derma-ai-memories',
        JSON.stringify({ memories: next.slice(0, 30) }),
      )
    } catch {
      /* quota */
    }
    // Keep the in-memory Derma AI instance in sync if it's mounted.
    try {
      const w = window as unknown as {
        __dermaAI?: { clearAllMemories?: () => void; removeMemory?: (fact: string) => void }
      }
      if (next.length === 0 && w.__dermaAI?.clearAllMemories) {
        w.__dermaAI.clearAllMemories()
      }
    } catch {
      /* noop */
    }
  }

  const removeAiMemory = (fact: string) => {
    // Prefer the live helper when the chat component is mounted — it
    // updates its own reducer state in addition to persisting. Otherwise
    // fall back to a direct storage rewrite.
    try {
      const w = window as unknown as {
        __dermaAI?: { removeMemory?: (fact: string) => void }
      }
      if (w.__dermaAI?.removeMemory) {
        w.__dermaAI.removeMemory(fact)
        setAiMemories((prev) => prev.filter((m) => m !== fact))
        return
      }
    } catch {
      /* noop */
    }
    writeAiMemories(aiMemories.filter((m) => m !== fact))
  }

  const clearAllAiMemories = () => {
    writeAiMemories([])
  }

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
        // Initialize profile edit fields
        setEditFirstName(authData.user.firstName || '')
        setEditLastName(authData.user.lastName || '')
        setEditPhone(authData.user.phone || '')
        setEditDateOfBirth(authData.user.dateOfBirth || '')
        setAvatarUrl(authData.user.avatarUrl || null)
        setEditUsername(authData.user.username || '')
        setEditBio(authData.user.bio || '')
        setEditSocials({
          website: authData.user.website || '',
          instagram: authData.user.instagram || '',
          twitter: authData.user.twitter || '',
          tiktok: authData.user.tiktok || '',
          facebook: authData.user.facebook || '',
          linkedin: authData.user.linkedin || '',
          youtube: authData.user.youtube || '',
        })
        // DB default is `true`. We only flip to `false` when the
        // server explicitly says so, so legacy rows / any failure to
        // read the column stay visible (safe default for the user's
        // intent — they did set up a profile to be seen).
        setIsPublic(authData.user.isPublic === false ? false : true)

        // Check password status
        const passRes = await fetch('/api/auth/password')
        if (passRes.ok) {
          const passData = await passRes.json()
          setHasPassword(passData.hasPassword)
          setAuthProvider(passData.authProvider)
        }

        // Fetch passkeys
        const passkeysRes = await fetch('/api/auth/passkey/list')
        if (passkeysRes.ok) {
          const passkeysData = await passkeysRes.json()
          setPasskeys(passkeysData.passkeys || [])
        }

        // Fetch 2FA status
        const twoFARes = await fetch('/api/auth/2fa/status')
        if (twoFARes.ok) {
          const twoFAData = await twoFARes.json()
          setTwoFAEnabled(twoFAData.isEnabled)
          setBackupCodesRemaining(twoFAData.backupCodesRemaining)
        }

        // Fetch wallet and settings
        const [walletRes, settingsRes] = await Promise.all([
          fetch('/api/wallet'),
          fetch('/api/wallet/settings')
        ])

        if (walletRes.ok) {
          const walletData = await walletRes.json()
          setWallet(walletData.wallet)
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

  // Profile update handler
  const handleProfileUpdate = async () => {
    setProfileLoading(true)
    setProfileMessage(null)

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          phone: editPhone,
          avatarUrl: avatarUrl,
          // Empty string tells the API to clear the DOB; any valid
          // YYYY-MM-DD gets validated + stored on the server.
          dateOfBirth: editDateOfBirth,
          // Bio + socials — empty strings are allowed and clear the
          // column on the server (the API treats '' the same as null).
          bio: editBio,
          ...editSocials,
        })
      })

      const data = await res.json()

      if (res.ok) {
        setUser({
          ...user!,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          phone: data.user.phone,
          avatarUrl: data.user.avatarUrl,
          dateOfBirth: data.user.dateOfBirth,
          bio: data.user.bio,
          website: data.user.website,
          instagram: data.user.instagram,
          twitter: data.user.twitter,
          tiktok: data.user.tiktok,
          facebook: data.user.facebook,
          linkedin: data.user.linkedin,
          youtube: data.user.youtube,
        })
        setProfileMessage({ type: 'success', text: 'Profile updated successfully!' })
        setIsEditingProfile(false)
      } else {
        setProfileMessage({ type: 'error', text: data.error || 'Failed to update profile' })
      }
    } catch {
      setProfileMessage({ type: 'error', text: 'Failed to update profile' })
    } finally {
      setProfileLoading(false)
    }
  }

  // Persist an avatar URL immediately (used by the spa-avatar picker
  // and by the upload flow below once the file has been turned into a
  // URL). We send firstName/lastName alongside because the profile
  // validator requires them — we just echo the current values so this
  // call never clears the name row as a side effect.
  const saveAvatarUrl = async (nextUrl: string | null) => {
    const previous = avatarUrl
    setAvatarUrl(nextUrl)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          phone: user?.phone || '',
          avatarUrl: nextUrl,
        }),
      })
      if (!res.ok) throw new Error('avatar save failed')
      const data = await res.json()
      setUser((prev) =>
        prev ? { ...prev, avatarUrl: data.user.avatarUrl } : prev,
      )
      setProfileMessage({ type: 'success', text: 'Avatar updated!' })
    } catch {
      setAvatarUrl(previous)
      setProfileMessage({
        type: 'error',
        text: "We couldn't update your avatar. Please try again.",
      })
    }
  }

  // Avatar upload handler
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      setProfileMessage({ type: 'error', text: 'Please select an image file' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileMessage({ type: 'error', text: 'Image must be less than 5MB' })
      return
    }

    setAvatarUploading(true)
    setProfileMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (res.ok) {
        // Persist the new avatar immediately so the user doesn't have
        // to remember to press Save — matches the spa-avatar picker
        // flow which also saves on tap.
        await saveAvatarUrl(data.url)
        setShowAvatarPicker(false)
      } else {
        setProfileMessage({ type: 'error', text: data.error || 'Failed to upload avatar' })
      }
    } catch {
      setProfileMessage({ type: 'error', text: 'Failed to upload avatar' })
    } finally {
      setAvatarUploading(false)
    }
  }

  // Username check with debounce
  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null)
      return
    }
    
    // Validate format
    const usernameRegex = /^[a-zA-Z0-9_]+$/
    if (!usernameRegex.test(username)) {
      setUsernameAvailable(false)
      setUsernameMessage({ type: 'error', text: 'Only letters, numbers, and underscores allowed' })
      return
    }
    
    setIsCheckingUsername(true)
    try {
      const res = await fetch(`/api/user/username?username=${encodeURIComponent(username)}`)
      const data = await res.json()
      setUsernameAvailable(data.available)
      if (!data.available && username !== user?.username) {
        setUsernameMessage({ type: 'error', text: 'Username already taken' })
      } else {
        setUsernameMessage(null)
      }
    } catch {
      setUsernameAvailable(null)
    } finally {
      setIsCheckingUsername(false)
    }
  }

  const handleUsernameUpdate = async () => {
    if (!editUsername || editUsername.length < 3) {
      setUsernameMessage({ type: 'error', text: 'Username must be at least 3 characters' })
      return
    }
    
    if (editUsername === user?.username) {
      setUsernameMessage({ type: 'success', text: 'Username unchanged' })
      return
    }
    
    setUsernameLoading(true)
    setUsernameMessage(null)
    
    try {
      const res = await fetch('/api/user/username', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: editUsername }),
        credentials: 'include'
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setUser({ ...user!, username: data.username })
        setUsernameMessage({ type: 'success', text: 'Username updated successfully!' })
        setTimeout(() => setUsernameMessage(null), 3000)
      } else {
        setUsernameMessage({ type: 'error', text: data.error || 'Failed to update username' })
      }
    } catch {
      setUsernameMessage({ type: 'error', text: 'Failed to update username' })
    } finally {
      setUsernameLoading(false)
    }
  }

  // Privacy toggle — persists immediately rather than waiting for
  // the profile save button. We optimistically flip the UI state
  // first for instant feedback, then revert on failure so the user
  // can see we didn't silently swallow the error. Uses the same
  // PUT /api/auth/profile endpoint as the rest of the form; we just
  // send only the field we're changing.
  const handleTogglePrivacy = async (nextPublic: boolean) => {
    const previous = isPublic
    setIsPublic(nextPublic)
    setPrivacyLoading(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // firstName/lastName are required by the endpoint's
          // validator. Echo the current values so the name row
          // isn't cleared as a side effect of a privacy flip.
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          phone: user?.phone || '',
          avatarUrl: user?.avatarUrl || null,
          isPublic: nextPublic,
        }),
      })
      if (!res.ok) throw new Error('Failed to update privacy')
      const data = await res.json()
      setUser((prev) => (prev ? { ...prev, isPublic: data.user.isPublic } : prev))
    } catch {
      setIsPublic(previous)
      setProfileMessage({
        type: 'error',
        text: "We couldn't update your privacy setting. Please try again.",
      })
    } finally {
      setPrivacyLoading(false)
    }
  }

  const startEditingProfile = () => {
    setEditFirstName(user?.firstName || '')
    setEditLastName(user?.lastName || '')
    setEditPhone(user?.phone || '')
    setEditBio(user?.bio || '')
    setEditSocials({
      website: user?.website || '',
      instagram: user?.instagram || '',
      twitter: user?.twitter || '',
      tiktok: user?.tiktok || '',
      facebook: user?.facebook || '',
      linkedin: user?.linkedin || '',
      youtube: user?.youtube || '',
    })
    setIsEditingProfile(true)
    setProfileMessage(null)
  }

  const cancelEditingProfile = () => {
    setEditFirstName(user?.firstName || '')
    setEditLastName(user?.lastName || '')
    setEditPhone(user?.phone || '')
    setAvatarUrl(user?.avatarUrl || null)
    setEditBio(user?.bio || '')
    setEditSocials({
      website: user?.website || '',
      instagram: user?.instagram || '',
      twitter: user?.twitter || '',
      tiktok: user?.tiktok || '',
      facebook: user?.facebook || '',
      linkedin: user?.linkedin || '',
      youtube: user?.youtube || '',
    })
    setIsEditingProfile(false)
    setProfileMessage(null)
  }

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

  const formatCurrency = (amount: number | null | undefined) => {
    // Handle NaN, undefined, or null values
    const safeAmount = (amount === null || amount === undefined || isNaN(amount)) ? 0 : amount
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(safeAmount)
  }

  // Passkey handlers
  const handleAddPasskey = async () => {
    setPasskeyLoading(true)
    setPasskeyMessage(null)

    try {
      console.log('[v0] Starting passkey setup from settings...')
      
      const optionsRes = await fetch('/api/auth/passkey/register/options', { method: 'POST' })
      if (!optionsRes.ok) {
        const errorData = await optionsRes.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to get registration options')
      }

      const options = await optionsRes.json()
      console.log('[v0] Got options, starting WebAuthn...')
      
      const credential = await startRegistration({ optionsJSON: options })
      console.log('[v0] WebAuthn completed, verifying...')

      const verifyRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, name: newPasskeyName || 'My Passkey' })
      })

      const verifyData = await verifyRes.json()
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Failed to register passkey')
      }

      // Refresh passkeys list
      const passkeysRes = await fetch('/api/auth/passkey/list')
      if (passkeysRes.ok) {
        const passkeysData = await passkeysRes.json()
        setPasskeys(passkeysData.passkeys || [])
      }

      setPasskeyMessage({ type: 'success', text: 'Passkey added successfully!' })
      setShowAddPasskey(false)
      setNewPasskeyName('')
    } catch (err) {
      console.error('[v0] Passkey error:', err)
      let errorMessage = 'Failed to add passkey'
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Passkey setup was cancelled or not allowed.'
        } else if (err.name === 'NotSupportedError') {
          errorMessage = 'Your device does not support passkeys.'
        } else if (err.name === 'InvalidStateError') {
          errorMessage = 'A passkey for this device already exists.'
        } else {
          errorMessage = err.message
        }
      }
      setPasskeyMessage({ type: 'error', text: errorMessage })
    } finally {
      setPasskeyLoading(false)
    }
  }

  // Passkey deletion — confirmation is now handled by the branded
  // <ConfirmDialog> (see below), which sets `passkeyToDelete` to the
  // row in question. The actual delete runs inside the dialog's
  // onConfirm handler.
  const deletePasskeyById = async (passkeyId: string) => {
    try {
      const res = await fetch(`/api/auth/passkey/${passkeyId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete passkey')

      setPasskeys(passkeys.filter(p => p.id !== passkeyId))
      setPasskeyMessage({ type: 'success', text: 'Passkey deleted successfully' })
    } catch {
      setPasskeyMessage({ type: 'error', text: 'Failed to delete passkey' })
      // Rethrow so the ConfirmDialog keeps itself open and the user
      // can retry. Without this, the dialog closes on error and the
      // error toast is the only hint something went wrong.
      throw new Error('delete-failed')
    }
  }

  // 2FA handlers
  const handleSetup2FA = async () => {
    setTwoFALoading(true)
    setTwoFAMessage(null)

    try {
      console.log('[v0] handleSetup2FA: Starting 2FA setup')
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      console.log('[v0] handleSetup2FA: Response status', res.status)
      
      if (!res.ok) {
        const errorText = await res.text()
        console.log('[v0] handleSetup2FA: Error response', errorText)
        throw new Error('Failed to setup 2FA')
      }

      const data = await res.json()
      console.log('[v0] handleSetup2FA: Response data', {
        hasQrCodeUrl: !!data.qrCodeUrl,
        qrCodeUrlLength: data.qrCodeUrl?.length,
        hasSecret: !!data.secret,
        secretLength: data.secret?.length
      })
      
      setQrCodeUrl(data.qrCodeUrl)
      setTotpSecret(data.secret)
      setShowSetup2FA(true)
    } catch (error) {
      console.log('[v0] handleSetup2FA: Error', error)
      setTwoFAMessage({ type: 'error', text: 'Failed to setup 2FA' })
    } finally {
      setTwoFALoading(false)
    }
  }

  const handleVerify2FA = async () => {
    setTwoFALoading(true)
    setTwoFAMessage(null)

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Invalid code')
      }

      const data = await res.json()
      setBackupCodes(data.backupCodes)
      setShowBackupCodes(true)
      setTwoFAEnabled(true)
      setShowSetup2FA(false)
      setVerificationCode('')
      setTwoFAMessage({ type: 'success', text: '2FA enabled successfully!' })
    } catch (err) {
      setTwoFAMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to verify code' })
    } finally {
      setTwoFALoading(false)
    }
  }

  const handleDisable2FA = async () => {
    setTwoFALoading(true)
    setTwoFAMessage(null)

    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Invalid code')
      }

      setTwoFAEnabled(false)
      setShowDisable2FA(false)
      setDisableCode('')
      setTwoFAMessage({ type: 'success', text: '2FA disabled successfully' })
    } catch (err) {
      setTwoFAMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to disable 2FA' })
    } finally {
      setTwoFALoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
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
    { id: 'security', label: 'Security', icon: LockKeyhole, description: 'Password and authentication' },
    { id: 'wallet', label: 'Wallet', icon: Wallet, description: 'Budget and payment settings' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Email and alert preferences' },
    { id: 'assistant', label: 'Derma AI', icon: ButterflyLogo, description: 'Link your account to the assistant' },
  ] as const

  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      <div className="py-4 sm:py-6 md:py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <Link
              href="/dashboard"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Manage your account and preferences</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
            {/* Sidebar */}
            <div className="lg:w-56 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-gray-100 p-1.5 sm:p-2 lg:sticky lg:top-24">
                <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0 scrollbar-hide">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-left transition-colors whitespace-nowrap flex-shrink-0 w-auto lg:w-full ${
                        activeSection === section.id
                          ? 'bg-[#7B2D8E] text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <section.icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span className="text-sm font-medium">{section.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 space-y-4 sm:space-y-6">
              {/* Account Section */}
              {activeSection === 'account' && (
                <>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900">Account Information</h2>
                    {!isEditingProfile && (
                      <button
                        onClick={startEditingProfile}
                        className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-[#7B2D8E] border border-[#7B2D8E] rounded-xl hover:bg-[#7B2D8E]/5 transition-colors w-full sm:w-auto"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit Profile
                      </button>
                    )}
                  </div>

                  {profileMessage && (
                    <div className="rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 bg-[#7B2D8E]/10 border border-[#7B2D8E]/20" role="status" aria-live="polite">
                      <div className="flex items-start sm:items-center gap-2">
                        {profileMessage.type === 'success' 
                          ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E] flex-shrink-0 mt-0.5 sm:mt-0" />
                          : <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E] flex-shrink-0 mt-0.5 sm:mt-0" />
                        }
                        <p className="text-xs sm:text-sm font-medium text-[#7B2D8E]">
                          {profileMessage.text}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-4 sm:space-y-6">
                    {/* Avatar Section — the whole avatar tile is now a
                        single tap target that opens the spa-avatar
                        picker. The picker itself offers both "upload
                        your own" and the curated spa collection, so
                        users don't have to enter edit mode just to
                        change how they look. */}
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="relative flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowAvatarPicker(true)}
                          className="group block w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden bg-[#7B2D8E] hover:ring-4 hover:ring-[#7B2D8E]/20 transition-all"
                          aria-label="Change avatar"
                        >
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="w-full h-full flex items-center justify-center text-white text-lg sm:text-2xl font-semibold">
                              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAvatarPicker(true)}
                          disabled={avatarUploading}
                          className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center hover:bg-[#5A1D6A] transition-colors shadow-lg"
                          aria-label="Change avatar"
                        >
                          {avatarUploading ? (
                            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                          ) : (
                            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          )}
                        </button>
                        {/* Upload-from-device was removed — users
                            now pick from a curated set via the
                            AvatarPicker below. */}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base sm:text-lg font-medium text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs sm:text-sm text-gray-500 truncate">{user?.email}</p>
                        {authProvider === 'google' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full mt-1">
                            <svg className="w-3 h-3" viewBox="0 0 24 24">
                              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Google
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowAvatarPicker(true)}
                          className="inline-flex items-center gap-1 mt-1 sm:mt-2 text-xs font-medium text-[#7B2D8E] hover:underline"
                        >
                          Change avatar
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4 sm:pt-6">
                      <div className="grid gap-3 sm:gap-4">
                        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">First Name</label>
                            <input
                              type="text"
                              value={isEditingProfile ? editFirstName : (user?.firstName || '')}
                              onChange={(e) => setEditFirstName(e.target.value)}
                              disabled={!isEditingProfile}
                              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border rounded-xl transition-colors ${
                                isEditingProfile 
                                  ? 'border-gray-200 focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] outline-none text-gray-900' 
                                  : 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed'
                              }`}
                              placeholder="First name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Last Name</label>
                            <input
                              type="text"
                              value={isEditingProfile ? editLastName : (user?.lastName || '')}
                              onChange={(e) => setEditLastName(e.target.value)}
                              disabled={!isEditingProfile}
                              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border rounded-xl transition-colors ${
                                isEditingProfile 
                                  ? 'border-gray-200 focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] outline-none text-gray-900' 
                                  : 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed'
                              }`}
                              placeholder="Last name"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                          <input
                            type="tel"
                            value={isEditingProfile ? editPhone : (user?.phone || '')}
                            onChange={(e) => setEditPhone(e.target.value)}
                            disabled={!isEditingProfile}
                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border rounded-xl transition-colors ${
                              isEditingProfile 
                                ? 'border-gray-200 focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] outline-none text-gray-900' 
                                : 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
                            placeholder="Enter your phone number"
                          />
                        </div>
                        {/* Date of birth — branded <DatePicker> matches the
                            rest of the app's purple design system and makes
                            year-jumping painless. */}
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                            Date of Birth
                          </label>
                          <DatePicker
                            value={isEditingProfile ? editDateOfBirth : (user?.dateOfBirth || '')}
                            onChange={setEditDateOfBirth}
                            disabled={!isEditingProfile}
                            placeholder="Add your birthday"
                            ariaLabel="Date of birth"
                          />
                          <p className="text-xs text-gray-400 mt-1">
                            We&apos;ll send a little something on your birthday
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email Address</label>
                          <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                          />
                          <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                        </div>
                      </div>

                      {/* Bio + socials — only shown when the user is
                          actively editing so the read-only view stays
                          compact. Bio gets a full-width textarea with
                          a live character counter (500 cap matches
                          the server-side LIMITS.bio). Each social
                          input accepts either a handle (e.g. `@sidi`)
                          or a full URL — the public profile API
                          normalises both into tappable links. */}
                      {isEditingProfile && (
                        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100 space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs sm:text-sm font-medium text-gray-700">
                                Bio
                              </label>
                              <span className="text-[10px] text-gray-400 tabular-nums">
                                {editBio.length}/500
                              </span>
                            </div>
                            <textarea
                              value={editBio}
                              onChange={(e) => setEditBio(e.target.value.slice(0, 500))}
                              rows={3}
                              placeholder="Tell people a little about yourself…"
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] outline-none text-gray-900 placeholder-gray-400 resize-none"
                              maxLength={500}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              Shown on your public profile page.
                            </p>
                          </div>

                          <div>
                            <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
                              Social links
                            </p>
                            <p className="text-[11px] text-gray-400 mb-3">
                              Paste a full URL or just your @handle — we&apos;ll link it up.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {(
                                [
                                  { key: 'website', label: 'Website', placeholder: 'yoursite.com' },
                                  { key: 'instagram', label: 'Instagram', placeholder: '@handle' },
                                  { key: 'twitter', label: 'X (Twitter)', placeholder: '@handle' },
                                  { key: 'tiktok', label: 'TikTok', placeholder: '@handle' },
                                  { key: 'facebook', label: 'Facebook', placeholder: 'username' },
                                  { key: 'linkedin', label: 'LinkedIn', placeholder: 'username' },
                                  { key: 'youtube', label: 'YouTube', placeholder: '@channel' },
                                ] as const
                              ).map(({ key, label, placeholder }) => (
                                <div key={key}>
                                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                    {label}
                                  </label>
                                  <input
                                    type="text"
                                    value={editSocials[key]}
                                    onChange={(e) =>
                                      setEditSocials((prev) => ({
                                        ...prev,
                                        [key]: e.target.value,
                                      }))
                                    }
                                    placeholder={placeholder}
                                    maxLength={200}
                                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] outline-none text-gray-900 placeholder-gray-400"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Profile visibility — always visible (not
                          behind the edit gate) because flipping a
                          privacy setting should never require the
                          user to hunt for an edit button. The toggle
                          persists immediately via handleTogglePrivacy
                          and the copy reflects the current state so
                          it's obvious what "on" actually means. */}
                      <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100">
                        <div className="rounded-xl border border-gray-200 p-3 sm:p-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isPublic
                                  ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {isPublic ? (
                                <Globe className="w-4 h-4" />
                              ) : (
                                <LockKeyhole className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-gray-900 leading-tight">
                                  {isPublic ? 'Public profile' : 'Private profile'}
                                </p>
                                {privacyLoading && (
                                  <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
                                )}
                              </div>
                              <p className="text-[11px] sm:text-xs text-gray-500 leading-snug mt-0.5">
                                {isPublic
                                  ? 'Anyone with your profile link can see your bio, stats and socials.'
                                  : 'Only you can see your profile page. It\u2019s hidden from everyone else.'}
                              </p>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isPublic}
                              aria-label="Toggle profile visibility"
                              onClick={() => handleTogglePrivacy(!isPublic)}
                              disabled={privacyLoading}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30 disabled:opacity-60 ${
                                isPublic ? 'bg-[#7B2D8E]' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  isPublic ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>

                      {isEditingProfile ? (
                        <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                          <button
                            onClick={cancelEditingProfile}
                            className="flex-1 py-2.5 sm:py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 sm:gap-2"
                          >
                            <XIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Cancel</span>
                          </button>
                          <button
                            onClick={handleProfileUpdate}
                            disabled={profileLoading || !editFirstName || !editLastName}
                            className="flex-1 py-2.5 sm:py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#5A1D6A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5 sm:gap-2"
                          >
                            {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {profileLoading ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mt-3 sm:mt-4">
                          Tap &quot;Edit Profile&quot; to update your information
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Username Section */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
                  <div className="flex items-start sm:items-center gap-3 mb-4 sm:mb-6">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                      <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base sm:text-lg font-semibold text-gray-900">Public Profile URL</h2>
                      <p className="text-xs sm:text-sm text-gray-500">Set a unique username for your public profile</p>
                    </div>
                  </div>

                  {usernameMessage && (
                    <div className={`rounded-xl p-3 sm:p-4 mb-4 ${
                      usernameMessage.type === 'success' 
                        ? 'bg-[#7B2D8E]/10 border border-[#7B2D8E]/20' 
                        : 'bg-[#7B2D8E]/5 border border-[#7B2D8E]/20'
                    }`}>
                      <div className="flex items-start sm:items-center gap-2">
                        {usernameMessage.type === 'success' 
                          ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E] flex-shrink-0" />
                          : <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E] flex-shrink-0" />
                        }
                        <p className={`text-xs sm:text-sm font-medium ${
                          usernameMessage.type === 'success' ? 'text-[#7B2D8E]' : 'text-[#7B2D8E]'
                        }`}>
                          {usernameMessage.text}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Username</label>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex-1 flex items-center gap-0 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-[#7B2D8E]/20 focus-within:border-[#7B2D8E] overflow-hidden">
                          <span className="bg-gray-50 text-xs sm:text-sm text-gray-500 px-3 py-2.5 sm:py-3 border-r border-gray-200 flex-shrink-0 whitespace-nowrap">
                            dermaspaceng.com/
                          </span>
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={editUsername}
                              onChange={(e) => {
                                const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                                setEditUsername(value)
                                checkUsernameAvailability(value)
                              }}
                              className="w-full px-3 pr-8 py-2.5 sm:py-3 text-sm border-0 focus:ring-0 outline-none text-gray-900 bg-transparent"
                              placeholder="yourname"
                              maxLength={30}
                            />
                            {isCheckingUsername && (
                              <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                            )}
                            {!isCheckingUsername && usernameAvailable === true && editUsername !== user?.username && (
                              <Check className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7B2D8E]" strokeWidth={3} />
                            )}
                            {!isCheckingUsername && usernameAvailable === false && editUsername !== user?.username && (
                              <XIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7B2D8E]" />
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">3-30 characters. Letters, numbers, and underscores only.</p>
                    </div>

                    {user?.username && (
                      <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                        <p className="text-xs sm:text-sm text-gray-600">
                          Your public profile: <a href={`/${user.username}`} target="_blank" rel="noopener noreferrer" className="text-[#7B2D8E] font-medium hover:underline">dermaspaceng.com/{user.username}</a>
                        </p>
                      </div>
                    )}

                    <button
                      onClick={handleUsernameUpdate}
                      disabled={usernameLoading || !editUsername || editUsername.length < 3 || usernameAvailable === false}
                      className="w-full py-2.5 sm:py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#5A1D6A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {usernameLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {usernameLoading ? 'Saving...' : 'Save Username'}
                    </button>
                  </div>
                </div>
                </>
              )}

              {/* Security Section */}
              {activeSection === 'security' && (
                <div className="space-y-4 sm:space-y-6">
                  {/* Password Section */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
                    <div className="flex items-start sm:items-center gap-3 mb-4 sm:mb-6">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                        <KeyRound className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E]" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                          {hasPassword ? 'Change Password' : 'Set Password'}
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {hasPassword 
                            ? 'Update your password to keep your account secure'
                            : 'Set a password to log in with email and password'
                          }
                        </p>
                      </div>
                    </div>

                    {!hasPassword && authProvider === 'google' && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                        <div className="flex items-start gap-2 sm:gap-3">
                          <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-blue-900">Google Account Connected</p>
                            <p className="text-xs sm:text-sm text-blue-700 mt-1">
                              You signed up with Google. Set a password to also log in with email.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {passwordMessage && (
                      <div className={`rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 ${
                      passwordMessage.type === 'success' 
                        ? 'bg-green-50 border border-green-100' 
                        : 'bg-[#7B2D8E]/5 border border-[#7B2D8E]/20'
                    }`}>
                      <div className="flex items-start sm:items-center gap-2">
                        {passwordMessage.type === 'success' 
                          ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                          : <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E] flex-shrink-0" />
                        }
                        <p className={`text-xs sm:text-sm font-medium ${
                          passwordMessage.type === 'success' ? 'text-green-900' : 'text-[#7B2D8E]'
                        }`}>
                            {passwordMessage.text}
                          </p>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handlePasswordSubmit} className="space-y-3 sm:space-y-4">
                      {hasPassword && (
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                            Current Password
                          </label>
                          <div className="relative">
                            <input
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] outline-none transition-colors pr-10 sm:pr-12"
                              placeholder="Current password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                            >
                              {showCurrentPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                            </button>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] outline-none transition-colors pr-10 sm:pr-12"
                            placeholder="New password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">At least 8 characters</p>
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] outline-none transition-colors"
                          placeholder="Confirm password"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={passwordLoading || !newPassword || !confirmPassword || (hasPassword && !currentPassword)}
                        className="w-full py-2.5 sm:py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {passwordLoading ? 'Saving...' : hasPassword ? 'Update Password' : 'Set Password'}
                      </button>
                    </form>
                  </div>

                  {/* Passkeys Section */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                          <ScanFace className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E]" />
                        </div>
                        <div>
                          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Passkeys</h2>
                          <p className="text-xs sm:text-sm text-gray-500">Sign in with biometrics or device PIN</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAddPasskey(true)}
                        className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] transition-colors w-full sm:w-auto"
                      >
                        <Plus className="w-4 h-4" />
                        Add Passkey
                      </button>
                    </div>

                    {passkeyMessage && (
                      <div className={`rounded-xl p-3 sm:p-4 mb-4 ${
                        passkeyMessage.type === 'success' 
                          ? 'bg-[#7B2D8E]/10 border border-[#7B2D8E]/20' 
                        : 'bg-[#7B2D8E]/5 border border-[#7B2D8E]/20'
                    }`}>
                      <div className="flex items-start sm:items-center gap-2">
                        {passkeyMessage.type === 'success' 
                          ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E] flex-shrink-0" />
                          : <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E] flex-shrink-0" />
                        }
                        <p className={`text-xs sm:text-sm font-medium ${
                          passkeyMessage.type === 'success' ? 'text-[#7B2D8E]' : 'text-[#7B2D8E]'
                        }`}>
                            {passkeyMessage.text}
                          </p>
                        </div>
                      </div>
                    )}

                    {passkeys.length === 0 ? (
                      <div className="text-center py-6 sm:py-8 bg-gray-50 rounded-xl">
                        <ScanFace className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2 sm:mb-3" />
                        <p className="text-gray-500 text-xs sm:text-sm">No passkeys registered yet</p>
                        <p className="text-gray-400 text-xs mt-1">Add a passkey for faster sign-ins</p>
                      </div>
                    ) : (
                      <div className="space-y-2 sm:space-y-3">
                        {passkeys.map((passkey) => (
                          <div key={passkey.id} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                                <KeyRound className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{passkey.name}</p>
                                <p className="text-xs text-gray-500 truncate">
                                  Added {new Date(passkey.created_at).toLocaleDateString()}
                                  {passkey.last_used_at && ` • Used ${new Date(passkey.last_used_at).toLocaleDateString()}`}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => setPasskeyToDelete({ id: passkey.id, name: passkey.name })}
                              className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                              aria-label={`Delete passkey ${passkey.name}`}
                            >
                              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Passkey Modal */}
                    {showAddPasskey && (
                      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-[60]">
                        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 sm:p-6">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Add a Passkey</h3>
                          <div className="mb-4">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                              Passkey Name
                            </label>
                            <input
                              type="text"
                              value={newPasskeyName}
                              onChange={(e) => setNewPasskeyName(e.target.value)}
                              placeholder="e.g., MacBook Pro, iPhone"
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] outline-none"
                            />
                          </div>
                          <div className="flex gap-2 sm:gap-3 pb-4 sm:pb-0">
                            <button
                              onClick={() => { setShowAddPasskey(false); setNewPasskeyName('') }}
                              className="flex-1 py-2.5 sm:py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleAddPasskey}
                              disabled={passkeyLoading}
                              className="flex-1 py-2.5 sm:py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                              {passkeyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanFace className="w-4 h-4" />}
                              {passkeyLoading ? 'Adding...' : 'Add'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Two-Factor Authentication Section */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                          <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E]" />
                        </div>
                        <div>
                          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Two-Factor Auth</h2>
                          <p className="text-xs sm:text-sm text-gray-500">Extra security with an authenticator app</p>
                        </div>
                      </div>
                      {twoFAEnabled ? (
                        <span className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#7B2D8E]/10 text-[#7B2D8E] text-xs sm:text-sm font-medium rounded-full w-full sm:w-auto">
                          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Enabled
                        </span>
                      ) : (
                        <button
                          onClick={handleSetup2FA}
                          disabled={twoFALoading}
                          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] transition-colors disabled:opacity-50 w-full sm:w-auto"
                        >
                          {twoFALoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                          Enable 2FA
                        </button>
                      )}
                    </div>

                    {twoFAMessage && (
                      <div className={`rounded-xl p-3 sm:p-4 mb-4 ${
                      twoFAMessage.type === 'success' 
                        ? 'bg-[#7B2D8E]/10 border border-[#7B2D8E]/20' 
                        : 'bg-[#7B2D8E]/5 border border-[#7B2D8E]/20'
                    }`}>
                      <div className="flex items-start sm:items-center gap-2">
                        {twoFAMessage.type === 'success' 
                          ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E] flex-shrink-0" />
                          : <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E] flex-shrink-0" />
                        }
                        <p className="text-xs sm:text-sm font-medium text-[#7B2D8E]">
                            {twoFAMessage.text}
                          </p>
                        </div>
                      </div>
                    )}

                    {twoFAEnabled ? (
                      <div className="space-y-3 sm:space-y-4">
                        <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-xl">
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-gray-900">Authenticator App</p>
                            <p className="text-xs text-gray-500">
                              {backupCodesRemaining > 0 
                                ? `${backupCodesRemaining} backup codes left`
                                : 'No backup codes left'
                              }
                            </p>
                          </div>
                          <button
                            onClick={() => setShowDisable2FA(true)}
                            className="text-xs sm:text-sm text-red-600 hover:text-red-700 font-medium"
                          >
                            Disable
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                        <p className="text-xs sm:text-sm text-gray-600">
                          Use an authenticator app like Google Authenticator to generate one-time codes for signing in.
                        </p>
                      </div>
                    )}

                    {/* Setup 2FA Modal */}
                    {showSetup2FA && (
                      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-[60]">
                        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Set Up Two-Factor Auth</h3>
                          
                          <div className="mb-4 sm:mb-6">
                            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                              Scan this QR code with your authenticator app:
                            </p>
                            <div className="flex justify-center mb-3 sm:mb-4">
                              {qrCodeUrl ? (
                                <img src={qrCodeUrl} alt="2FA QR Code" className="w-36 h-36 sm:w-48 sm:h-48 border rounded-xl" />
                              ) : (
                                <div className="w-36 h-36 sm:w-48 sm:h-48 border rounded-xl bg-[#7B2D8E]/5 flex items-center justify-center">
                                  <Loader2 className="w-8 h-8 animate-spin text-[#7B2D8E]" />
                                </div>
                              )}
                            </div>
                            <div className="bg-gray-50 rounded-xl p-2.5 sm:p-3">
                              <p className="text-xs text-gray-500 mb-1">Or enter manually:</p>
                              <div className="flex items-center gap-2">
                                <code className="flex-1 text-xs sm:text-sm font-mono text-gray-900 break-all">{totpSecret || 'Loading...'}</code>
                                <button
                                  onClick={() => copyToClipboard(totpSecret)}
                                  disabled={!totpSecret}
                                  className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                >
                                  <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="mb-4">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                              Enter 6-digit code
                            </label>
                            <input
                              type="text"
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="000000"
                              maxLength={6}
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] outline-none text-center text-xl sm:text-2xl tracking-widest font-mono"
                            />
                          </div>

                          <div className="flex gap-2 sm:gap-3 pb-4 sm:pb-0">
                            <button
                              onClick={() => { setShowSetup2FA(false); setVerificationCode('') }}
                              className="flex-1 py-2.5 sm:py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleVerify2FA}
                              disabled={twoFALoading || verificationCode.length !== 6}
                              className="flex-1 py-2.5 sm:py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                              {twoFALoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                              {twoFALoading ? 'Verifying...' : 'Enable'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Backup Codes Modal */}
                    {showBackupCodes && backupCodes.length > 0 && (
                      <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[60]">
                        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 pb-24 sm:pb-6">
                          <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-4">
                              <Check className="w-8 h-8 text-[#7B2D8E]" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">2FA Enabled Successfully</h3>
                            <p className="text-sm text-gray-600 mt-2">
                              Save these backup codes in a safe place. You can use them to sign in if you lose access to your authenticator app.
                            </p>
                          </div>

                          <div className="bg-gray-50 rounded-xl p-4 mb-4">
                            <div className="grid grid-cols-2 gap-2">
                              {backupCodes.map((code, index) => (
                                <code key={index} className="text-sm font-mono text-gray-900 bg-white px-3 py-2 rounded-lg text-center border">
                                  {code}
                                </code>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={() => copyToClipboard(backupCodes.join('\n'))}
                            className="w-full py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 mb-3"
                          >
                            <Copy className="w-4 h-4" />
                            Copy All Codes
                          </button>

                          <button
                            onClick={() => { setShowBackupCodes(false); setBackupCodes([]) }}
                            className="w-full py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] transition-colors"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Disable 2FA Modal */}
                    {showDisable2FA && (
                      <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[60]">
                        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 pb-24 sm:pb-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Disable Two-Factor Authentication</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Enter a code from your authenticator app to confirm disabling 2FA.
                          </p>

                          <div className="mb-4">
                            <input
                              type="text"
                              value={disableCode}
                              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="000000"
                              maxLength={6}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] outline-none text-center text-2xl tracking-widest font-mono"
                            />
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() => { setShowDisable2FA(false); setDisableCode('') }}
                              className="flex-1 py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleDisable2FA}
                              disabled={twoFALoading || disableCode.length !== 6}
                              className="flex-1 py-3 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                              {twoFALoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                              {twoFALoading ? 'Disabling...' : 'Disable 2FA'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Wallet Section */}
              {activeSection === 'wallet' && (
                <div className="space-y-4 sm:space-y-6">
                  {/* Wallet Overview Card */}
                  <div className="bg-[#7B2D8E] rounded-2xl p-4 sm:p-6 text-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                          <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-white/70">Wallet Balance</p>
                          <p className="text-xl sm:text-2xl font-bold">{wallet ? formatCurrency(wallet.balance) : '---'}</p>
                        </div>
                      </div>
                      <Link
                        href="/dashboard/wallet"
                        className="flex items-center justify-center gap-1 px-3 sm:px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors w-full sm:w-auto"
                      >
                        View Wallet
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>

                  {/* Budget Settings */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-4 sm:mb-6">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                        <Target className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E]" />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-semibold text-gray-900">Budget Settings</h2>
                        <p className="text-xs sm:text-sm text-gray-500">Set spending limits and alerts</p>
                      </div>
                    </div>

                    {settingsMessage && (
                      <div className="rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 bg-[#7B2D8E]/10 border border-[#7B2D8E]/20" role="status" aria-live="polite">
                        <div className="flex items-start sm:items-center gap-2">
                          {settingsMessage.type === 'success' 
                            ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E] flex-shrink-0" />
                            : <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E] flex-shrink-0" />
                          }
                          <p className="text-xs sm:text-sm font-medium text-[#7B2D8E]">
                            {settingsMessage.text}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4 sm:space-y-6">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Monthly Budget (Optional)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₦</span>
                          <input
                            type="number"
                            value={walletSettings.monthly_budget || ''}
                            onChange={(e) => setWalletSettings(prev => ({ 
                              ...prev, 
                              monthly_budget: e.target.value ? Number(e.target.value) : null 
                            }))}
                            className="w-full pl-7 sm:pl-8 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] outline-none transition-colors"
                            placeholder="e.g. 100000"
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Leave empty for no limit</p>
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                          Alert at: {walletSettings.budget_alert_threshold}%
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
                          Get notified at this % of budget
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Low Balance Alert
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₦</span>
                          <input
                            type="number"
                            value={walletSettings.low_balance_alert}
                            onChange={(e) => setWalletSettings(prev => ({ 
                              ...prev, 
                              low_balance_alert: Number(e.target.value) 
                            }))}
                            className="w-full pl-7 sm:pl-8 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] outline-none transition-colors"
                            placeholder="e.g. 5000"
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Alert when balance drops below
                        </p>
                      </div>

                      <button
                        onClick={handleWalletSettingsSave}
                        disabled={settingsLoading}
                        className="w-full py-2.5 sm:py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {settingsLoading ? 'Saving...' : 'Save Settings'}
                      </button>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-4 sm:mb-6">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E]" />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-semibold text-gray-900">Payment Methods</h2>
                        <p className="text-xs sm:text-sm text-gray-500">Manage your payment options</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#7B2D8E"/>
                              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#7B2D8E" strokeWidth="2"/>
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Paystack</p>
                            <p className="text-xs text-gray-500">Cards, Bank Transfer, USSD</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-[#7B2D8E]/10 text-[#7B2D8E] text-xs font-medium rounded-full">
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
                        <span className="px-2 py-1 bg-[#7B2D8E]/10 text-[#7B2D8E] text-xs font-medium rounded-full">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Section — sized to match sibling dashboard
                  panels (p-4 sm:p-6, w-9 sm:w-10 header icon, text-base
                  sm:text-lg heading). Previously it used hard-coded desktop
                  sizes that felt oversized on mobile. */}
              {activeSection === 'notifications' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                      <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E]" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">Notification Preferences</h2>
                      <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Choose what notifications you receive</p>
                    </div>
                  </div>

                  {settingsMessage && (
                    <div className={`rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 ${
                      settingsMessage.type === 'success' 
                        ? 'bg-[#7B2D8E]/10 border border-[#7B2D8E]/20' 
                        : 'bg-[#7B2D8E]/5 border border-[#7B2D8E]/20'
                    }`}>
                      <div className="flex items-start sm:items-center gap-2">
                        {settingsMessage.type === 'success' 
                          ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E] flex-shrink-0" />
                          : <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E] flex-shrink-0" />
                        }
                        <p className="text-xs sm:text-sm font-medium text-[#7B2D8E]">
                          {settingsMessage.text}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2.5 sm:space-y-3">
                    {[
                      { key: 'email_notifications', label: 'Email Notifications', description: 'Receive notifications via email' },
                      { key: 'transaction_alerts', label: 'Transaction Alerts', description: 'Get notified for all wallet transactions' },
                      { key: 'budget_alerts', label: 'Budget Alerts', description: 'Receive alerts when approaching budget limits' },
                      { key: 'promotional_emails', label: 'Promotional Emails', description: 'Receive offers and promotional content' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between gap-3 p-3 sm:p-4 border border-gray-200 rounded-xl">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.label}</p>
                          <p className="text-xs text-gray-500 leading-snug">{item.description}</p>
                        </div>
                        <button
                          onClick={() => setWalletSettings(prev => ({ 
                            ...prev, 
                            [item.key]: !prev[item.key as keyof WalletSettings] 
                          }))}
                          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                            walletSettings[item.key as keyof WalletSettings] 
                              ? 'bg-[#7B2D8E]' 
                              : 'bg-gray-200'
                          }`}
                          aria-pressed={!!walletSettings[item.key as keyof WalletSettings]}
                          aria-label={item.label}
                        >
                          <span 
                            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                              walletSettings[item.key as keyof WalletSettings] 
                                ? 'translate-x-5' 
                                : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={handleWalletSettingsSave}
                      disabled={settingsLoading}
                      className="w-full py-2.5 sm:py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-4 sm:mt-6"
                    >
                      {settingsLoading ? 'Saving...' : 'Save Notification Preferences'}
                    </button>
                  </div>
                </div>
              )}

              {/* Derma AI Section — lets the user grant or revoke account
                  access for the in-app assistant. Keeping this in
                  settings (vs an in-chat modal) means users who never
                  open the chat can still opt in proactively, and they
                  always have a clear way to revoke. */}
              {activeSection === 'assistant' && (
                // Mirror the Account section's sizing vocabulary so this
                // panel feels native to the rest of the dashboard — same
                // responsive padding (p-4 sm:p-6), same border weight
                // (gray-100), same heading scale (text-base sm:text-lg).
                <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
                  {/* Personalized hero — a signed-in greeting that
                      mirrors the chat's welcome screen, with a live
                      status pill showing whether the assistant is
                      currently linked + remembering. Makes this panel
                      feel like it knows the user rather than a generic
                      settings card. */}
                  <div className="relative mb-5 sm:mb-6 rounded-2xl overflow-hidden bg-[#7B2D8E] text-white p-4 sm:p-5">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl"
                    />
                    <div className="relative flex items-start gap-3">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center flex-shrink-0">
                        <ButterflyLogo className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-white/70">
                          Derma AI · Concierge
                        </p>
                        <h2 className="text-base sm:text-lg font-semibold leading-tight mt-0.5 truncate">
                          {user?.firstName
                            ? `${user.firstName}, meet your assistant.`
                            : 'Meet your assistant.'}
                        </h2>
                        <p className="text-[11px] sm:text-xs text-white/80 mt-1 leading-snug max-w-md">
                          Choose what Derma can see and do on your behalf — and review the
                          things it has learned about you.
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${
                              aiAccountAccess
                                ? 'bg-white/15 ring-white/25 text-white'
                                : 'bg-white/5 ring-white/15 text-white/70'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                aiAccountAccess ? 'bg-white' : 'bg-white/50'
                              }`}
                              aria-hidden="true"
                            />
                            {aiAccountAccess ? 'Account linked' : 'Not linked'}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 ring-1 ring-white/20 text-white">
                            {aiMemories.length} remembered
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-3 sm:gap-4 p-3 sm:p-4 border border-gray-200 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">Link my account to the assistant</p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Master switch for Derma AI. When on, the assistant can use the categories
                        below to help you. Turn off to revoke access entirely.
                      </p>
                      {aiAccountAccess && (
                        <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#7B2D8E] bg-[#7B2D8E]/10 px-2 py-1 rounded-full">
                          <Check className="w-3 h-3" strokeWidth={2.5} />
                          Linked
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={toggleAiAccountAccess}
                      disabled={aiAccountAccess === null}
                      aria-pressed={aiAccountAccess ?? false}
                      aria-label="Link my account to Derma AI"
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                        aiAccountAccess ? 'bg-[#7B2D8E]' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          aiAccountAccess ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Per-capability grants — only meaningful while the
                      master switch is on. Each category controls which
                      tools the assistant is allowed to call on your
                      behalf. Unchecking a category tells the model to
                      decline or ask before touching that data. */}
                  <div className="mt-3 sm:mt-4">
                    <p className="text-xs font-semibold text-gray-700 mb-2">
                      What Derma AI can access
                    </p>
                    <div className={`space-y-2 ${!aiAccountAccess ? 'opacity-50 pointer-events-none' : ''}`}>
                      {([
                        {
                          key: 'wallet' as const,
                          label: 'Wallet & transactions',
                          description: 'Check balance, review spend, start a top-up when asked.',
                        },
                        {
                          key: 'bookings' as const,
                          label: 'Bookings & appointments',
                          description: 'See upcoming visits, cancel, or reschedule on request.',
                        },
                        {
                          key: 'profile' as const,
                          label: 'Profile & contact',
                          description: 'Read your name, phone, email; update basics you ask it to.',
                        },
                        {
                          key: 'preferences' as const,
                          label: 'Skincare preferences',
                          description: 'Use your skin type and concerns to personalise advice.',
                        },
                        {
                          key: 'support' as const,
                          label: 'Support tickets',
                          description: 'View your tickets and open new ones when you need help.',
                        },
                        {
                          key: 'notifications' as const,
                          label: 'Activity & notifications',
                          description: 'Summarise recent alerts so Derma can follow up on them.',
                        },
                      ] as const).map((cap) => (
                        <div
                          key={cap.key}
                          className="flex items-start justify-between gap-3 p-3 border border-gray-200 rounded-xl"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900">{cap.label}</p>
                            <p className="text-xs text-gray-500 leading-snug mt-0.5">
                              {cap.description}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleAiPermission(cap.key)}
                            aria-pressed={aiPermissions[cap.key]}
                            aria-label={cap.label}
                            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${
                              aiPermissions[cap.key] ? 'bg-[#7B2D8E]' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                aiPermissions[cap.key] ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Long-term memory manager — lists every fact Derma
                      has learned about the user. Each entry can be
                      removed individually; a destructive "Clear all"
                      wipes the lot. Kept monochrome-brand so the panel
                      stays cohesive with the rest of the settings app. */}
                  <div className="mt-3 sm:mt-4 p-3 sm:p-4 border border-gray-200 rounded-xl">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          What Derma remembers
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#7B2D8E]/10 text-[10px] font-bold text-[#7B2D8E]">
                            {aiMemories.length}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                          Personal facts Derma saved during conversations. Remove anything you&apos;d like it to forget.
                        </p>
                      </div>
                      {aiMemories.length > 0 && (
                        <button
                          type="button"
                          onClick={clearAllAiMemories}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-gray-200 text-[11px] font-semibold text-gray-600 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                          Clear all
                        </button>
                      )}
                    </div>

                    {aiMemories.length === 0 ? (
                      <div className="mt-3 py-5 text-center rounded-xl bg-[#7B2D8E]/[0.04] border border-dashed border-[#7B2D8E]/20">
                        <p className="text-xs text-gray-500 leading-relaxed px-4">
                          Nothing saved yet. When you share preferences, allergies or goals in a chat,
                          Derma will remember them here.
                        </p>
                      </div>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {aiMemories.map((fact) => (
                          <li
                            key={fact}
                            className="group flex items-start gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#7B2D8E]/[0.04] transition-colors"
                          >
                            <span
                              aria-hidden="true"
                              className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#7B2D8E] flex-shrink-0"
                            />
                            <p className="text-xs text-gray-700 leading-snug flex-1 min-w-0 break-words">
                              {fact}
                            </p>
                            <button
                              type="button"
                              onClick={() => removeAiMemory(fact)}
                              aria-label={`Forget: ${fact}`}
                              className="opacity-60 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md text-gray-400 hover:text-[#7B2D8E] hover:bg-white transition"
                            >
                              <XIcon className="w-3 h-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Privacy note — swapped the amber accent for a soft
                      brand wash so the whole panel reads monochrome
                      instead of pulling in a color we don't use
                      elsewhere in the settings app. */}
                  <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-[#7B2D8E]/5 border border-[#7B2D8E]/15 rounded-xl flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-700 leading-relaxed">
                      The assistant never sees your password, your card details, or private medical notes.
                      It only acts on the commands you send during a chat.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Disconnect-account confirmation. Rendered at the page root so
          it sits above every other scroll container and absorbs focus
          while open. Styled in brand purple (not a red "destructive"
          dialog) because the action is recoverable — the user can
          reconnect any time — and we want the UI to feel considered,
          not scary. */}
      {showAiDisconnectConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="derma-disconnect-title"
          onClick={() => setShowAiDisconnectConfirm(false)}
        >
          <div
            className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-[derma-msg-in_0.2s_ease-out_both]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Brand-colored top band so the dialog reads on-brand
                instead of like a generic system alert. */}
            <div className="h-1 bg-[#7B2D8E]" />
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                  <ButterflyLogo className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    id="derma-disconnect-title"
                    className="text-base font-semibold text-gray-900 tracking-tight"
                  >
                    Disconnect from Derma AI?
                  </h3>
                  <p className="mt-1 text-[13px] text-gray-600 leading-relaxed">
                    Derma AI will stop seeing your wallet, bookings, profile, and notifications.
                    You can reconnect at any time.
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setShowAiDisconnectConfirm(false)}
                  className="px-4 py-2.5 rounded-full border border-gray-200 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Keep connected
                </button>
                <button
                  type="button"
                  onClick={confirmAiDisconnect}
                  className="px-4 py-2.5 rounded-full bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#6B2278] transition-colors shadow-sm shadow-[#7B2D8E]/30"
                >
                  Yes, disconnect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Avatar picker — shared by the avatar tile, the camera
          button, and the "Change avatar" link. Saving happens inside
          `onSelect` so the new avatar persists the moment the user
          taps "Use Avatar". Uploads from device have been removed in
          favor of a curated 3D character set. */}
      <AvatarPicker
        open={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
        currentUrl={avatarUrl}
        initials={`${user?.firstName?.charAt(0) || ''}${user?.lastName?.charAt(0) || ''}`.toUpperCase()}
        onSelect={async (url) => {
          await saveAvatarUrl(url)
        }}
      />

      {/* Passkey delete confirmation — replaces the native
          window.confirm() with a branded bottom sheet matching the
          "Disconnect from Derma AI?" card shown elsewhere in the
          product. `passkeyToDelete` carries the row so onConfirm
          knows which passkey to remove. */}
      <ConfirmDialog
        open={!!passkeyToDelete}
        onOpenChange={(o) => !o && setPasskeyToDelete(null)}
        icon={<KeyRound className="w-6 h-6" />}
        title="Delete this passkey?"
        description={
          passkeyToDelete
            ? `"${passkeyToDelete.name}" will be removed. You'll need another sign-in method next time, and you can always add a new passkey later.`
            : ''
        }
        confirmLabel="Yes, delete passkey"
        cancelLabel="Keep passkey"
        variant="destructive"
        onConfirm={async () => {
          if (!passkeyToDelete) return
          await deletePasskeyById(passkeyToDelete.id)
          setPasskeyToDelete(null)
        }}
      />

      <Footer />
    </main>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    }>
      <SettingsPageContent />
    </Suspense>
  )
}
