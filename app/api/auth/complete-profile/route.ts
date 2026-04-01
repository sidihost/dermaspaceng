import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { phone, firstName, lastName, avatarUrl, username } = await request.json()
    
    // Validate phone number
    if (!phone || phone.trim().length < 10) {
      return NextResponse.json({ error: 'Please provide a valid phone number' }, { status: 400 })
    }
    
    // Build update query dynamically
    const updates: string[] = []
    const values: (string | boolean | null)[] = []
    let paramIndex = 1
    
    // Always update profile_complete and updated_at
    updates.push(`profile_complete = true`)
    updates.push(`updated_at = NOW()`)
    
    if (phone) {
      updates.push(`phone = $${paramIndex}`)
      values.push(phone.trim())
      paramIndex++
    }
    
    if (firstName) {
      updates.push(`first_name = $${paramIndex}`)
      values.push(firstName.trim())
      paramIndex++
    }
    
    if (lastName) {
      updates.push(`last_name = $${paramIndex}`)
      values.push(lastName.trim())
      paramIndex++
    }
    
    if (avatarUrl) {
      updates.push(`avatar_url = $${paramIndex}`)
      values.push(avatarUrl)
      paramIndex++
    }
    
    if (username) {
      // Validate username format
      const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/
      if (!usernameRegex.test(username)) {
        return NextResponse.json({ error: 'Invalid username format' }, { status: 400 })
      }
      
      // Check if username is taken
      const existing = await query(
        `SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2`,
        [username, user.id]
      )
      if (existing.rows && existing.rows.length > 0) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
      }
      
      updates.push(`username = $${paramIndex}`)
      values.push(username.toLowerCase())
      paramIndex++
    }
    
    values.push(user.id)
    
    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
    
    return NextResponse.json({ success: true, message: 'Profile completed successfully' })
    
  } catch (error) {
    console.error('Complete profile error:', error)
    return NextResponse.json({ error: 'Failed to complete profile' }, { status: 500 })
  }
}
