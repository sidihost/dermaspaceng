export type StaffRole = 'admin' | 'staff'

export type MemberStatus = 'verified' | 'pending' | 'suspended'

export type StaffStatusFilter = 'all' | MemberStatus

export type StaffRoleFilter = 'all' | StaffRole

export type StaffSortKey = 'newest' | 'name' | 'active' | 'role'

export interface StaffMember {
  id: string
  email: string | null
  username: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  avatar_url: string | null
  role: string
  is_active: boolean
  email_verified: boolean
  must_change_password: boolean
  is_super_admin: boolean
  can_manage_services: boolean
  created_at: string
  last_seen_at?: string | null
  replies_count: number
  complaints_assigned: number
  consultations_assigned: number
  gift_cards_assigned: number
  live_chats_assigned?: number
  bookings_assigned?: number
}

export interface StaffInvitation {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string
  invited_by_name: string | null
  invited_by_last: string | null
  invite_url?: string | null
}

export interface StaffFilterOptions {
  query: string
  status: StaffStatusFilter
  role: StaffRoleFilter
  sort: StaffSortKey
}

export interface StaffSummary {
  total: number
  admins: number
  staffCount: number
  verified: number
  pending: number
  suspended: number
  serviceEditors: number
  invitationsCount: number
}

export interface InvitationExpiryInfo {
  label: string
  isExpired: boolean
  isUrgent: boolean
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  if (!email) return true
  const normalized = email.trim().toLowerCase()
  if (!normalized) return true
  if (normalized.startsWith('pending+') && normalized.endsWith('@dermaspaceng.invalid')) {
    return true
  }
  if (normalized.endsWith('@staff.dermaspace.local') || normalized.endsWith('.invalid')) {
    return true
  }
  return false
}

export function getMemberStatus(
  member: Pick<StaffMember, 'is_active' | 'email_verified' | 'must_change_password'>
): MemberStatus {
  if (member.is_active === false) return 'suspended'
  if (member.must_change_password || !member.email_verified) return 'pending'
  return 'verified'
}

export function getMemberDisplayName(
  member: Pick<StaffMember, 'first_name' | 'last_name' | 'username' | 'email'>
): string {
  const first = (member.first_name ?? '').trim()
  const last = (member.last_name ?? '').trim()
  const full = `${first} ${last}`.trim()
  if (full) return full
  if (member.username && member.username.trim()) return `@${member.username.trim()}`
  if (member.email && !isPlaceholderEmail(member.email)) return member.email
  return 'Unnamed staff'
}

export function getMemberInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email?: string | null
): string {
  const first = (firstName ?? '').trim()
  const last = (lastName ?? '').trim()
  if (first && last) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
  }
  if (first) {
    return first.slice(0, 2).toUpperCase()
  }
  if (last) {
    return last.slice(0, 2).toUpperCase()
  }
  const cleanEmail = (email ?? '').trim()
  if (cleanEmail && !isPlaceholderEmail(cleanEmail)) {
    return cleanEmail.slice(0, 2).toUpperCase()
  }
  return 'DS'
}

export function getMemberTotalActivity(
  member: Pick<
    StaffMember,
    | 'replies_count'
    | 'complaints_assigned'
    | 'consultations_assigned'
    | 'gift_cards_assigned'
    | 'live_chats_assigned'
    | 'bookings_assigned'
  >
): number {
  return (
    (Number(member.replies_count) || 0) +
    (Number(member.complaints_assigned) || 0) +
    (Number(member.consultations_assigned) || 0) +
    (Number(member.gift_cards_assigned) || 0) +
    (Number(member.live_chats_assigned) || 0) +
    (Number(member.bookings_assigned) || 0)
  )
}

export function computeStaffSummary(
  staff: StaffMember[],
  invitations: StaffInvitation[]
): StaffSummary {
  let admins = 0
  let staffCount = 0
  let verified = 0
  let pending = 0
  let suspended = 0
  let serviceEditors = 0

  for (const member of staff) {
    if (member.role === 'admin') {
      admins += 1
      serviceEditors += 1
    } else {
      staffCount += 1
      if (member.can_manage_services) {
        serviceEditors += 1
      }
    }

    const status = getMemberStatus(member)
    if (status === 'verified') verified += 1
    else if (status === 'suspended') suspended += 1
    else pending += 1
  }

  return {
    total: staff.length,
    admins,
    staffCount,
    verified,
    pending,
    suspended,
    serviceEditors,
    invitationsCount: invitations.length,
  }
}

export function filterAndSortStaff(
  staff: StaffMember[],
  options: StaffFilterOptions
): StaffMember[] {
  const normalizedQuery = options.query.trim().toLowerCase()

  const filtered = staff.filter((member) => {
    if (options.status !== 'all' && getMemberStatus(member) !== options.status) {
      return false
    }

    if (options.role !== 'all') {
      const normalizedRole: StaffRole = member.role === 'admin' ? 'admin' : 'staff'
      if (normalizedRole !== options.role) return false
    }

    if (!normalizedQuery) return true

    const haystack = [
      member.first_name ?? '',
      member.last_name ?? '',
      getMemberDisplayName(member),
      member.username ?? '',
      isPlaceholderEmail(member.email) ? '' : member.email ?? '',
      member.phone ?? '',
      member.role ?? '',
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalizedQuery)
  })

  const sorted = [...filtered]
  sorted.sort((a, b) => {
    if (options.sort === 'name') {
      return getMemberDisplayName(a).localeCompare(getMemberDisplayName(b), undefined, {
        sensitivity: 'base',
      })
    }

    if (options.sort === 'active') {
      const diff = getMemberTotalActivity(b) - getMemberTotalActivity(a)
      if (diff !== 0) return diff
      return getMemberDisplayName(a).localeCompare(getMemberDisplayName(b), undefined, {
        sensitivity: 'base',
      })
    }

    if (options.sort === 'role') {
      const rank = (m: StaffMember) => (m.is_super_admin ? 0 : m.role === 'admin' ? 1 : 2)
      const diff = rank(a) - rank(b)
      if (diff !== 0) return diff
      return getMemberDisplayName(a).localeCompare(getMemberDisplayName(b), undefined, {
        sensitivity: 'base',
      })
    }

    // Default: newest first
    const timeA = Date.parse(a.created_at) || 0
    const timeB = Date.parse(b.created_at) || 0
    if (timeB !== timeA) return timeB - timeA
    return b.id.localeCompare(a.id)
  })

  return sorted
}

export function formatInvitationExpiry(
  expiresAt: string,
  nowMs: number = Date.now()
): InvitationExpiryInfo {
  const expiryMs = Date.parse(expiresAt)
  if (Number.isNaN(expiryMs)) {
    return { label: 'Unknown expiry', isExpired: false, isUrgent: false }
  }

  const diffMs = expiryMs - nowMs
  if (diffMs <= 0) {
    return { label: 'Expired', isExpired: true, isUrgent: true }
  }

  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60))
  if (totalHours < 24) {
    return {
      label: totalHours <= 1 ? 'Expires in <1h' : `Expires in ${totalHours}h`,
      isExpired: false,
      isUrgent: true,
    }
  }

  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  return {
    label: days === 1 ? 'Expires in 1d' : `Expires in ${days}d`,
    isExpired: false,
    isUrgent: days <= 2,
  }
}

export function formatInviterName(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string {
  const full = `${firstName ?? ''} ${lastName ?? ''}`.trim()
  return full || '—'
}

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const str = String(value ?? '')
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function buildStaffCsv(staff: StaffMember[]): string {
  const headers = [
    'ID',
    'Name',
    'Email',
    'Username',
    'Phone',
    'Role',
    'Super Admin',
    'Service Editor',
    'Status',
    'Replies',
    'Complaints',
    'Consultations',
    'Gift Cards',
    'Live Chats',
    'Bookings',
    'Total Activity',
    'Joined At',
  ]

  const rows = staff.map((member) => {
    const email = isPlaceholderEmail(member.email) ? '' : member.email ?? ''
    const serviceEditor = member.role === 'admin' || member.can_manage_services ? 'Yes' : 'No'
    return [
      member.id,
      getMemberDisplayName(member),
      email,
      member.username ?? '',
      member.phone ?? '',
      member.role === 'admin' ? 'Admin' : 'Staff',
      member.is_super_admin ? 'Yes' : 'No',
      serviceEditor,
      getMemberStatus(member),
      member.replies_count ?? 0,
      member.complaints_assigned ?? 0,
      member.consultations_assigned ?? 0,
      member.gift_cards_assigned ?? 0,
      member.live_chats_assigned ?? 0,
      member.bookings_assigned ?? 0,
      getMemberTotalActivity(member),
      member.created_at,
    ]
      .map(escapeCsvCell)
      .join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}
