// ---------------------------------------------------------------------------
// Pure cross-device synchronization & tombstone reconciliation for Derma AI
// saved conversation sessions. Keeps deletions & "Clear all" permanent across
// devices and sessions even when another device still holds stale localStorage.
// ---------------------------------------------------------------------------

export interface SyncableMessage {
  id: string
  role?: string
  timestamp?: string | Date
  [key: string]: unknown
}

export interface SyncableChatSession {
  id: string
  title?: string
  createdAt: string | Date
  updatedAt?: string | Date
  messages: SyncableMessage[]
  [key: string]: unknown
}

export interface SyncableActiveChat {
  sessionId?: string
  messages?: SyncableMessage[]
  isOpen?: boolean
  updatedAt?: string | Date
}

export interface ReconcileDermaSessionsInput<
  TSession extends SyncableChatSession = SyncableChatSession,
> {
  localSessions: TSession[]
  serverSessions: TSession[]
  localDeletedIds?: string[]
  serverDeletedIds?: string[]
  localClearedAt?: string | null
  serverClearedAt?: string | null
  active?: SyncableActiveChat | null
  maxSessions?: number
  maxDeletedIds?: number
}

export interface ReconcileDermaSessionsResult<
  TSession extends SyncableChatSession = SyncableChatSession,
> {
  sessions: TSession[]
  deletedIds: string[]
  clearedAt: string | null
  active: SyncableActiveChat | null
  shouldPushToServer: boolean
}

export const DEFAULT_MAX_TOMBSTONE_IDS = 250
export const DEFAULT_MAX_SESSIONS = 50

export function parseIsoMs(raw: string | Date | null | undefined): number {
  if (!raw) return 0
  if (raw instanceof Date) {
    const t = raw.getTime()
    return Number.isFinite(t) ? t : 0
  }
  if (typeof raw === 'string') {
    const t = new Date(raw).getTime()
    return Number.isFinite(t) ? t : 0
  }
  return 0
}

export function normalizeDeletedIds(
  raw: unknown,
  maxIds: number = DEFAULT_MAX_TOMBSTONE_IDS,
): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const clean = item.trim()
    if (!clean || clean.length > 160 || seen.has(clean)) continue
    seen.add(clean)
    ordered.push(clean)
  }
  if (ordered.length <= maxIds) return ordered
  // Keep most recently added tombstones at the tail
  return ordered.slice(ordered.length - maxIds)
}

export function getSessionActivityMs(session: SyncableChatSession): number {
  let latest = Math.max(
    parseIsoMs(session.createdAt),
    parseIsoMs(session.updatedAt),
  )
  if (Array.isArray(session.messages)) {
    for (const m of session.messages) {
      const ts = parseIsoMs(m?.timestamp)
      if (ts > latest) latest = ts
    }
  }
  // Numeric timestamp IDs (e.g. Date.now().toString()) provide an exact fallback
  if (latest === 0 && typeof session.id === 'string' && /^\d{12,15}$/.test(session.id)) {
    const idTs = Number(session.id)
    if (Number.isFinite(idTs)) latest = idTs
  }
  return latest
}

export function getActiveActivityMs(active: SyncableActiveChat | null | undefined): number {
  if (!active) return 0
  let latest = parseIsoMs(active.updatedAt)
  if (Array.isArray(active.messages)) {
    for (const m of active.messages) {
      if (m?.role === 'user') {
        const ts = parseIsoMs(m.timestamp)
        if (ts > latest) latest = ts
      }
    }
    if (latest === 0) {
      for (const m of active.messages) {
        const ts = parseIsoMs(m?.timestamp)
        if (ts > latest) latest = ts
      }
    }
  }
  if (latest === 0 && active.sessionId && /^\d{12,15}$/.test(active.sessionId)) {
    const idTs = Number(active.sessionId)
    if (Number.isFinite(idTs)) latest = idTs
  }
  return latest
}

/**
 * Merges local & server Derma AI chat history while strictly honoring:
 *  1) Per-session deletion tombstones (`deletedIds`) from either side,
 *  2) Global "Clear all" watermark (`clearedAt`) from either side so pre-clear
 *     conversations never resurrect on another device after login/sync.
 */
export function reconcileDermaSessions<TSession extends SyncableChatSession>(
  input: ReconcileDermaSessionsInput<TSession>,
): ReconcileDermaSessionsResult<TSession> {
  const maxSessions = input.maxSessions ?? DEFAULT_MAX_SESSIONS
  const maxDeletedIds = input.maxDeletedIds ?? DEFAULT_MAX_TOMBSTONE_IDS

  const localClearedMs = parseIsoMs(input.localClearedAt)
  const serverClearedMs = parseIsoMs(input.serverClearedAt)
  const effectiveClearedMs = Math.max(localClearedMs, serverClearedMs)
  const clearedAt =
    effectiveClearedMs > 0 ? new Date(effectiveClearedMs).toISOString() : null

  const mergedDeletedIds = normalizeDeletedIds(
    [
      ...(input.serverDeletedIds ?? []),
      ...(input.localDeletedIds ?? []),
    ],
    maxDeletedIds,
  )
  const deletedSet = new Set(mergedDeletedIds)

  const keepSession = (s: TSession | null | undefined): s is TSession => {
    if (!s || typeof s.id !== 'string' || !s.id.trim()) return false
    if (deletedSet.has(s.id)) return false
    if (effectiveClearedMs > 0) {
      const activityMs = getSessionActivityMs(s)
      // If we can establish it existed at or before the global clear, exclude it
      if (activityMs === 0 || activityMs <= effectiveClearedMs) {
        return false
      }
    }
    return true
  }

  const byId = new Map<string, TSession>()
  for (const s of input.serverSessions ?? []) {
    if (!keepSession(s)) continue
    byId.set(s.id, s)
  }

  for (const s of input.localSessions ?? []) {
    if (!keepSession(s)) continue
    const existing = byId.get(s.id)
    if (!existing) {
      byId.set(s.id, s)
      continue
    }
    const existingMsgs = Array.isArray(existing.messages) ? existing.messages.length : 0
    const localMsgs = Array.isArray(s.messages) ? s.messages.length : 0
    const existingAct = getSessionActivityMs(existing)
    const localAct = getSessionActivityMs(s)
    if (localMsgs > existingMsgs || (localMsgs === existingMsgs && localAct > existingAct)) {
      byId.set(s.id, s)
    }
  }

  const sessions = Array.from(byId.values())
    .sort((a, b) => getSessionActivityMs(b) - getSessionActivityMs(a))
    .slice(0, maxSessions)

  // Reconcile the active conversation as well
  let nextActive: SyncableActiveChat | null = input.active ?? null
  if (nextActive) {
    const activeId = (nextActive.sessionId ?? '').trim()
    if (activeId && deletedSet.has(activeId)) {
      nextActive = null
    } else if (effectiveClearedMs > 0) {
      const activeMs = getActiveActivityMs(nextActive)
      if (activeMs === 0 || activeMs <= effectiveClearedMs) {
        nextActive = null
      }
    }
  }

  // Determine whether the server copy needs updating (e.g. local had newer
  // deletions, a newer clear timestamp, or sessions not yet on the server).
  const serverIds = new Set(
    (input.serverSessions ?? []).filter((s) => s && s.id).map((s) => s.id),
  )
  const serverDeletedSet = new Set(
    normalizeDeletedIds(input.serverDeletedIds ?? [], maxDeletedIds),
  )

  const hasNewLocalSessions = sessions.some((s) => !serverIds.has(s.id))
  const hasNewDeletedIds = mergedDeletedIds.some((id) => !serverDeletedSet.has(id))
  const hasNewerClear = localClearedMs > serverClearedMs
  const serverHasStaleRemoved = (input.serverSessions ?? []).some(
    (s) => s?.id && !byId.has(s.id),
  )

  return {
    sessions,
    deletedIds: mergedDeletedIds,
    clearedAt,
    active: nextActive,
    shouldPushToServer:
      hasNewLocalSessions || hasNewDeletedIds || hasNewerClear || serverHasStaleRemoved,
  }
}
