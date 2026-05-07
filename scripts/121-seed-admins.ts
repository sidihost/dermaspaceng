/**
 * Seed admin accounts.
 *
 * Idempotent setup script run once after the 120 migration. It:
 *
 *   1. Promotes `info@sidihost.sbs` (the practice owner) to
 *      role='admin' AND is_super_admin=TRUE so they see the
 *      tech-heavy sections in the admin sidebar (Feature Flags,
 *      Schedules, System tab in Settings).
 *
 *   2. Creates two regular admin accounts for Itunu and Franca,
 *      each with:
 *        - a strong temporary password (printed to stdout — copy
 *          and share over a secure channel, the script never
 *          stores it anywhere readable)
 *        - must_change_password = TRUE so the first-login wizard
 *          runs and forces them to pick their own password,
 *          choose an avatar, and confirm their display name
 *        - role = 'admin', is_super_admin = FALSE
 *
 *   3. If the script is re-run after first-login (i.e. they've
 *      already finished onboarding), it leaves their password
 *      and onboarding state alone — only the role flag is
 *      re-asserted. So this is safe to run again, e.g. after
 *      restoring from a backup.
 *
 * Usage:
 *   pnpm exec tsx scripts/121-seed-admins.ts
 */

import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import { randomBytes, randomUUID } from 'crypto'

// ---- helpers ---------------------------------------------------

/**
 * 16-char temp password drawn from a deliberately reduced alphabet
 * (no l/1/I/O/0) so it's transcribable by phone if support has to
 * read it out. Strong enough on entropy (≈90 bits) since the user
 * MUST change it on first login.
 */
function tempPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = randomBytes(16)
  let out = ''
  for (let i = 0; i < 16; i++) {
    out += alphabet[bytes[i] % alphabet.length]
  }
  return out
}

interface SeedTarget {
  username: string
  firstName: string
  lastName: string
  /**
   * Optional placeholder email. Itunu and Franca will replace
   * these themselves from Settings — the field is required at the
   * column level, so we generate a unique-by-username dummy that
   * passes validation.
   */
  placeholderEmail: string
}

const REGULAR_ADMINS: SeedTarget[] = [
  {
    username: 'itunu',
    firstName: 'Itunu',
    lastName: '',
    placeholderEmail: 'itunu@admin.dermaspaceng.local',
  },
  {
    username: 'franca',
    firstName: 'Franca',
    lastName: '',
    placeholderEmail: 'franca@admin.dermaspaceng.local',
  },
]

const SUPER_ADMIN_EMAIL = 'info@sidihost.sbs'

// ---- main ------------------------------------------------------

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('[seed-admins] DATABASE_URL is not set')
    process.exit(1)
  }
  const sql = neon(url)

  console.log('\n[seed-admins] starting…\n')

  // ── 1. Promote the super admin ────────────────────────────────
  const superRows = await sql`
    SELECT id, role, is_super_admin
    FROM users
    WHERE LOWER(email) = ${SUPER_ADMIN_EMAIL.toLowerCase()}
    LIMIT 1
  `
  if (superRows.length === 0) {
    console.warn(
      `[seed-admins] WARNING: no user found for ${SUPER_ADMIN_EMAIL}.\n` +
        '  Sign in once with that account to create the row, then re-run this script.\n',
    )
  } else {
    await sql`
      UPDATE users
         SET role = 'admin',
             is_super_admin = TRUE,
             must_change_password = FALSE,
             updated_at = NOW()
       WHERE id = ${superRows[0].id}
    `
    console.log(`[seed-admins] promoted ${SUPER_ADMIN_EMAIL} → super admin`)
  }

  // ── 2. Seed Itunu and Franca ──────────────────────────────────
  for (const target of REGULAR_ADMINS) {
    const existing = await sql`
      SELECT id, must_change_password
      FROM users
      WHERE LOWER(username) = ${target.username.toLowerCase()}
      LIMIT 1
    `

    if (existing.length > 0) {
      // Already exists. Re-assert role only — don't overwrite
      // their password if they've already onboarded.
      await sql`
        UPDATE users
           SET role = 'admin',
               is_super_admin = FALSE,
               is_active = TRUE,
               updated_at = NOW()
         WHERE id = ${existing[0].id}
      `
      console.log(
        `[seed-admins] kept existing user ${target.username} ` +
          `(must_change_password=${existing[0].must_change_password})`,
      )
      continue
    }

    // Brand new account — generate temp password and force the
    // onboarding wizard on first login.
    const id = randomUUID()
    const pw = tempPassword()
    const hash = await bcrypt.hash(pw, 12)

    await sql`
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, username,
        role, is_super_admin, must_change_password,
        is_active, email_verified, created_at, updated_at
      ) VALUES (
        ${id},
        ${target.placeholderEmail.toLowerCase()},
        ${hash},
        ${target.firstName},
        ${target.lastName},
        ${target.username.toLowerCase()},
        'admin',
        FALSE,
        TRUE,
        TRUE,
        TRUE,
        NOW(),
        NOW()
      )
    `

    console.log('\n  ─────────────────────────────────────────────')
    console.log(`  Username   : ${target.username}`)
    console.log(`  Temp pass  : ${pw}`)
    console.log(`  Role       : admin (regular)`)
    console.log(`  First login: forced to change password + onboarding`)
    console.log('  ─────────────────────────────────────────────')
  }

  console.log(
    '\n[seed-admins] done. Share the temp passwords above over a secure channel — they are NOT stored anywhere readable.\n',
  )
}

main().catch((err) => {
  console.error('[seed-admins] failed:', err)
  process.exit(1)
})
