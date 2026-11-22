import assert from 'node:assert/strict'
import test from 'node:test'
import {
  normalizeDeletedIds,
  reconcileDermaSessions,
  type SyncableChatSession,
} from './derma-sessions-sync'

function makeSession(
  id: string,
  createdIso: string,
  msgCount = 2,
): SyncableChatSession {
  return {
    id,
    title: `Chat ${id}`,
    createdAt: createdIso,
    messages: Array.from({ length: msgCount }, (_, i) => ({
      id: `${id}-m${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `msg ${i}`,
      timestamp: createdIso,
    })),
  }
}

test('deleted session on Device A does not resurrect when Device B still holds it locally', () => {
  const s1 = makeSession('chat-1', '2026-11-22T10:00:00.000Z')
  const s2 = makeSession('chat-2', '2026-11-22T11:00:00.000Z')

  // Device B has both s1 and s2 cached in localStorage; server has deleted s1
  const res = reconcileDermaSessions({
    localSessions: [s1, s2],
    serverSessions: [s2],
    localDeletedIds: [],
    serverDeletedIds: ['chat-1'],
  })

  assert.deepEqual(
    res.sessions.map((s) => s.id),
    ['chat-2'],
  )
  assert.equal(res.deletedIds.includes('chat-1'), true)
})

test('Clear all watermark on Device A removes older chats cached on Device B while keeping newer chats', () => {
  const oldChat = makeSession('old-1', '2026-11-22T09:00:00.000Z')
  const newChat = makeSession('new-1', '2026-11-22T12:30:00.000Z')
  const clearedAt = '2026-11-22T12:00:00.000Z'

  const res = reconcileDermaSessions({
    localSessions: [oldChat, newChat],
    serverSessions: [],
    serverClearedAt: clearedAt,
    active: {
      sessionId: 'old-1',
      messages: oldChat.messages,
      isOpen: true,
    },
  })

  assert.deepEqual(
    res.sessions.map((s) => s.id),
    ['new-1'],
  )
  assert.equal(res.active, null)
  assert.equal(res.clearedAt, clearedAt)
})

test('when server has clearedAt and zero sessions, Device B local older sessions are wiped cleanly', () => {
  const oldChat = makeSession('old-1', '2026-11-22T09:00:00.000Z')
  const res = reconcileDermaSessions({
    localSessions: [oldChat],
    serverSessions: [],
    serverClearedAt: '2026-11-22T10:00:00.000Z',
  })

  assert.equal(res.sessions.length, 0)
  assert.equal(res.shouldPushToServer, false)
})

test('merges non-deleted sessions from both devices and keeps the richer transcript', () => {
  const serverVersion = makeSession('chat-shared', '2026-11-22T10:00:00.000Z', 2)
  const localVersion = makeSession('chat-shared', '2026-11-22T10:00:00.000Z', 4)
  const serverOnly = makeSession('chat-srv', '2026-11-22T11:00:00.000Z', 2)

  const res = reconcileDermaSessions({
    localSessions: [localVersion],
    serverSessions: [serverVersion, serverOnly],
  })

  assert.deepEqual(
    res.sessions.map((s) => s.id),
    ['chat-srv', 'chat-shared'],
  )
  assert.equal(res.sessions[1].messages.length, 4)
  assert.equal(res.shouldPushToServer, false) // both IDs exist on server
})

test('normalizeDeletedIds deduplicates and bounds tombstones', () => {
  const normalized = normalizeDeletedIds(['a', 'b', 'a', 'c', ''], 2)
  assert.deepEqual(normalized, ['b', 'c'])
})
