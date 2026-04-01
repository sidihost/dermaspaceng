import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

// This endpoint sets a user as admin by email
// DELETE THIS FILE after setting up your admin account!
export async function POST(request: Request) {
  try {
    const { email, secretKey } = await request.json()

    // Simple secret key protection - change this to something unique
    if (secretKey !== 'dermaspace-setup-2024') {
      return NextResponse.json({ error: 'Invalid secret key' }, { status: 401 })
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Update user role to admin
    const result = await sql`
      UPDATE users 
      SET role = 'admin' 
      WHERE email = ${email}
      RETURNING id, email, first_name, last_name, role
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found with that email' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User is now an admin',
      user: result[0]
    })
  } catch (error) {
    console.error('Error making user admin:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
