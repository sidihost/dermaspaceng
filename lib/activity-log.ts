import { sql } from '@/lib/db'

export interface ActivityLogInput {
  staffId: string
  userId?: string | null
  actionType: string
  entityType: string
  entityId?: string | null
  description: string
}

/**
 * Best-effort audit logger for staff & admin actions in `activity_log`.
 * Never throws so an audit write issue can never block a primary workflow.
 */
export async function logStaffActivity(input: ActivityLogInput): Promise<void> {
  try {
    await sql`
      INSERT INTO activity_log (
        staff_id,
        user_id,
        action_type,
        entity_type,
        entity_id,
        description
      )
      VALUES (
        ${input.staffId},
        ${input.userId ?? null},
        ${input.actionType},
        ${input.entityType},
        ${input.entityId ?? null},
        ${input.description}
      )
    `
  } catch (err) {
    console.warn('[activity-log] insert failed:', err)
  }
}
