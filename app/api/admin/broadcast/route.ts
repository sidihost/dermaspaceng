/**
 * /api/admin/broadcast
 *
 *   GET   — list recent broadcasts (history + scheduled)
 *   POST  — create a broadcast (draft, scheduled, or send-now)
 *
 * The actual delivery work (resolve audience, fan-out push + in-app)
 * lives in `lib/broadcast-dispatcher.ts` so the cron worker can reuse
 * the exact same path.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'
import { dispatchBroadcast } from '@/lib/broadcast-dispatcher'

export async function GET() {
  try {
    await requireAdmin()
    const rows = (await sql`
      SELECT id, name, title, message, action_url, priority,
             audience, role, user_id, push_enabled, inapp_enabled,
             status, scheduled_at, sent_at, recipients, push_sent,
             push_removed, error, created_at
      FROM notification_broadcasts
      ORDER BY
        CASE WHEN status = 'scheduled' THEN 0 ELSE 1 END,
        COALESCE(scheduled_at, created_at) DESC
      LIMIT 50
    `) as unknown as Array<{
      id: string
      name: string | null
      title: string
      message: string
      action_url: string | null
      priority: string
      audience: string
      role: string | null
      user_id: string | null
      push_enabled: boolean
      inapp_enabled: boolean
      status: string
      scheduled_at: string | null
      sent_at: string | null
      recipients: number
      push_sent: number
      push_removed: number
      error: string | null
      created_at: string
    }>
    return NextResponse.json({ broadcasts: rows })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()

    const title = String(body.title || '').trim()
    const message = String(body.message || '').trim()
    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 },
      )
    }

    const audience = (
      ['all', 'role', 'user'].includes(body.audience) ? body.audience : 'all'
    ) as 'all' | 'role' | 'user'

    if (audience === 'user' && !body.userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const priority = (
      ['low', 'normal', 'high'].includes(body.priority) ? body.priority : 'normal'
    ) as 'low' | 'normal' | 'high'

    const intent = (
      ['send', 'schedule', 'draft'].includes(body.intent) ? body.intent : 'send'
    ) as 'send' | 'schedule' | 'draft'

    // Channel mix
    const pushEnabled = body.inappOnly ? false : true
    const inappEnabled = body.pushOnly ? false : true

    // Scheduling parse — only honoured when intent='schedule'.
    let scheduledAt: Date | null = null
    if (intent === 'schedule') {
      if (!body.scheduledAt) {
        return NextResponse.json(
          { error: 'scheduledAt required when scheduling' },
          { status: 400 },
        )
      }
      const parsed = new Date(body.scheduledAt)
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: 'Invalid scheduledAt' },
          { status: 400 },
        )
      }
      // Don't allow scheduling in the past (with 30s slack for clock skew).
      if (parsed.getTime() < Date.now() - 30_000) {
        return NextResponse.json(
          { error: 'Scheduled time must be in the future' },
          { status: 400 },
        )
      }
      scheduledAt = parsed
    }

    const initialStatus =
      intent === 'send' ? 'sending'
      : intent === 'schedule' ? 'scheduled'
      : 'draft'

    const inserted = (await sql`
      INSERT INTO notification_broadcasts (
        name, title, message, action_url, priority,
        audience, role, user_id,
        push_enabled, inapp_enabled,
        status, scheduled_at, created_by
      ) VALUES (
        ${body.name || null},
        ${title},
        ${message},
        ${body.actionUrl || null},
        ${priority},
        ${audience},
        ${audience === 'role' ? body.role || 'user' : null},
        ${audience === 'user' ? String(body.userId) : null},
        ${pushEnabled},
        ${inappEnabled},
        ${initialStatus},
        ${scheduledAt},
        ${admin.id}
      )
      RETURNING id
    `) as unknown as { id: string }[]

    const broadcastId = inserted[0].id

    // For 'send' we dispatch synchronously so the admin sees real
    // delivery numbers in the response. For 'schedule' / 'draft' we
    // simply return the row — the cron will pick it up later.
    if (intent === 'send') {
      const r = await dispatchBroadcast(broadcastId)

      // Audit log
      try {
        await sql`
          INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
          VALUES (
            ${admin.id},
            'broadcast_sent',
            'broadcast',
            ${broadcastId},
            ${`Broadcast "${title}" → ${audience} (${r.recipients} recipient(s))`}
          )
        `
      } catch { /* non-blocking */ }

      return NextResponse.json({
        ok: true,
        broadcastId,
        intent,
        recipients: r.recipients,
        push: { sent: r.pushSent, removed: r.pushRemoved },
      })
    }

    if (intent === 'schedule') {
      try {
        await sql`
          INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
          VALUES (
            ${admin.id},
            'broadcast_scheduled',
            'broadcast',
            ${broadcastId},
            ${`Scheduled "${title}" for ${scheduledAt?.toISOString()}`}
          )
        `
      } catch { /* non-blocking */ }
    }

    return NextResponse.json({
      ok: true,
      broadcastId,
      intent,
      scheduledAt: scheduledAt?.toISOString() || null,
    })
  } catch (err) {
    console.error('[admin/broadcast POST]', err)
    return NextResponse.json({ error: 'Failed to create broadcast' }, { status: 500 })
  }
}
