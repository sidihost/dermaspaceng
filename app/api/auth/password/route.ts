import { NextResponse } from 'next/server'
import { getCurrentUser, hashPassword, verifyPassword } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentPassword, newPassword, isSettingPassword } = await request.json()

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Get user with password hash to check auth provider
    const users = await sql`
      SELECT password_hash, auth_provider FROM users WHERE id = ${user.id}
    `
    
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = users[0]

    // If user signed up with Google and has no password, they can set one without current password
    if (isSettingPassword && (userData.auth_provider === 'google' || !userData.password_hash)) {
      const hashedPassword = await hashPassword(newPassword)
      await sql`
        UPDATE users
           SET password_hash        = ${hashedPassword},
               must_change_password = FALSE,
               updated_at           = NOW()
         WHERE id = ${user.id}
      `
      // Drop the cached /api/auth/me payload so the welcome gate
      // disappears on the next render — without invalidation it
      // would linger for up to 60s while the cached row still
      // says must_change_password=true.
      try {
        const { invalidateUserMe } = await import('@/lib/redis')
        invalidateUserMe(user.id).catch(() => {})
      } catch {
        /* noop */
      }
      return NextResponse.json({ success: true, message: 'Password set successfully' })
    }

    // For regular password change, verify current password
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
    }

    const isValid = await verifyPassword(currentPassword, userData.password_hash)
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    // Hash and update password. Also clears `must_change_password` —
    // a successful change is exactly the moment that flag should drop,
    // regardless of whether it was the seeded admin temp password or
    // a normal customer rotation.
    const hashedPassword = await hashPassword(newPassword)
    await sql`
      UPDATE users
         SET password_hash        = ${hashedPassword},
             must_change_password = FALSE,
             updated_at           = NOW()
       WHERE id = ${user.id}
    `
    try {
      const { invalidateUserMe } = await import('@/lib/redis')
      invalidateUserMe(user.id).catch(() => {})
    } catch {
      /* noop */
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' })
  } catch (error) {
    console.error('Password update error:', error)
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
  }
}

// Check if user has password set (for Google users)
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const users = await sql`
      SELECT password_hash, auth_provider FROM users WHERE id = ${user.id}
    `
    
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = users[0]
    const hasPassword = !!userData.password_hash
    const authProvider = userData.auth_provider || 'email'

    return NextResponse.json({ hasPassword, authProvider })
  } catch (error) {
    console.error('Password check error:', error)
    return NextResponse.json({ error: 'Failed to check password status' }, { status: 500 })
  }
}
