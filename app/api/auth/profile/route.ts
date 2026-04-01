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
    const { firstName, lastName, phone, avatarUrl } = body
    
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
    
    // Update user profile
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
    
    // Fetch updated user
    const users = await sql`
      SELECT id, email, first_name, last_name, phone, avatar_url, email_verified, role, created_at 
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
        createdAt: updatedUser.created_at
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
      SELECT id, email, first_name, last_name, phone, avatar_url, email_verified, role, created_at 
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
        createdAt: profile.created_at
      }
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 })
  }
}
