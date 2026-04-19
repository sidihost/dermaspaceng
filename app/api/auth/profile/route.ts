import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// PUT /api/auth/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { firstName, lastName, phone, avatarUrl, dateOfBirth } = body
    
    // Validate required fields
    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
    }
    
    // Validate name length
    if (firstName.length > 50 || lastName.length > 50) {
      return NextResponse.json({ error: 'Name must be less than 50 characters' }, { status: 400 })
    }
    
    // Validate phone if provided
    if (phone && phone.length > 20) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    // Validate DOB if supplied. Accept empty string / null to mean "clear it".
    let normalizedDob: string | null = null
    let clearDob = false
    if (dateOfBirth === '' || dateOfBirth === null) {
      clearDob = true
    } else if (typeof dateOfBirth === 'string' && dateOfBirth.trim() !== '') {
      const d = new Date(dateOfBirth)
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 })
      }
      const now = new Date()
      if (d > now) {
        return NextResponse.json({ error: 'Date of birth cannot be in the future' }, { status: 400 })
      }
      const thirteenYearsAgo = new Date(now.getFullYear() - 13, now.getMonth(), now.getDate())
      if (d > thirteenYearsAgo) {
        return NextResponse.json({ error: 'You must be at least 13 years old' }, { status: 400 })
      }
      normalizedDob = dateOfBirth
    }

    // Update user profile. We only touch `date_of_birth` when the caller
    // actually sent the field (so a client that never submits it doesn't
    // accidentally wipe a value set earlier).
    if (clearDob || normalizedDob !== null) {
      await sql`
        UPDATE users
        SET
          first_name = ${firstName.trim()},
          last_name = ${lastName.trim()},
          phone = ${phone?.trim() || null},
          avatar_url = ${avatarUrl || null},
          date_of_birth = ${normalizedDob},
          updated_at = NOW()
        WHERE id = ${user.id}
      `
    } else {
      await sql`
        UPDATE users
        SET
          first_name = ${firstName.trim()},
          last_name = ${lastName.trim()},
          phone = ${phone?.trim() || null},
          avatar_url = ${avatarUrl || null},
          updated_at = NOW()
        WHERE id = ${user.id}
      `
    }
    
    // Fetch updated user
    const users = await sql`
      SELECT id, email, first_name, last_name, phone, avatar_url, email_verified, role, created_at,
             TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS date_of_birth
      FROM users WHERE id = ${user.id}
    `
    
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const updatedUser = users[0]
    
    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        phone: updatedUser.phone,
        avatarUrl: updatedUser.avatar_url,
        emailVerified: updatedUser.email_verified,
        role: updatedUser.role,
        createdAt: updatedUser.created_at,
        dateOfBirth: updatedUser.date_of_birth || null,
      }
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}

// GET /api/auth/profile - Get user profile
export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const users = await sql`
      SELECT id, email, first_name, last_name, phone, avatar_url, email_verified, role, created_at,
             TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS date_of_birth
      FROM users WHERE id = ${user.id}
    `
    
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const profile = users[0]
    
    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        phone: profile.phone,
        avatarUrl: profile.avatar_url,
        emailVerified: profile.email_verified,
        role: profile.role,
        createdAt: profile.created_at,
        dateOfBirth: profile.date_of_birth || null,
      }
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 })
  }
}
