import { sql } from '@/lib/db'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  email_verified: boolean
  role: 'user' | 'staff' | 'admin'
  is_active: boolean
  created_at: Date
}

export interface Session {
  id: string
  user_id: string
  device_info: string
  ip_address: string
  created_at: Date
  expires_at: Date
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Create user
export async function createUser(data: {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  /**
   * ISO date string (YYYY-MM-DD). Optional — we never required DOB at signup
   * before and we still don't want to make it a hard block for existing
   * OAuth flows. Passed straight to Postgres as a DATE.
   */
  dateOfBirth?: string | null
  /**
   * Gender ('male' or 'female'). Defaults to null for legacy OAuth signups,
   * but when present triggers assignment of a sensible default avatar from
   * the gender-appropriate pool (so male users see male avatars, etc.).
   */
  gender?: 'male' | 'female' | null
}): Promise<{ user: User | null; error: string | null }> {
  try {
    // Check if user exists
    const existing = await sql`SELECT id FROM users WHERE email = ${data.email.toLowerCase()}`
    if (existing.length > 0) {
      return { user: null, error: 'Email already registered' }
    }

    const id = uuidv4()
    const hashedPassword = await hashPassword(data.password)
    const verificationToken = uuidv4()

    // Normalise DOB: empty string -> null so Postgres doesn't reject it.
    const dob = data.dateOfBirth && data.dateOfBirth.trim() !== '' ? data.dateOfBirth : null

    // Normalise gender — only accept 'male' / 'female', anything else
    // becomes null so we don't try to write an unsupported value to a
    // constrained column.
    const gender: 'male' | 'female' | null =
      data.gender === 'male' || data.gender === 'female' ? data.gender : null

    // Assign a default avatar matching the chosen gender. We pick a
    // deterministic tile based on user id so every new account lands
    // on a slightly different starter portrait. Users can change it
    // later from the avatar picker. When gender is unknown we leave
    // avatar_url NULL and render initials instead.
    const pool =
      gender === 'male'
        ? ['/avatars/m1.jpg', '/avatars/m2.jpg', '/avatars/m3.jpg', '/avatars/m4.jpg', '/avatars/m5.jpg', '/avatars/m6.jpg']
        : gender === 'female'
          ? ['/avatars/f1.jpg', '/avatars/f2.jpg', '/avatars/f3.jpg', '/avatars/f4.jpg', '/avatars/f5.jpg', '/avatars/f6.jpg']
          : []
    let defaultAvatar: string | null = null
    if (pool.length > 0) {
      // Hash the uuid to an index without pulling in a hashing lib.
      let acc = 0
      for (let i = 0; i < id.length; i++) acc = (acc + id.charCodeAt(i)) % 997
      defaultAvatar = pool[acc % pool.length]
    }

    await sql`
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, phone,
        verification_token, date_of_birth, gender, avatar_url
      )
      VALUES (
        ${id}, ${data.email.toLowerCase()}, ${hashedPassword},
        ${data.firstName}, ${data.lastName}, ${data.phone || null},
        ${verificationToken}, ${dob}, ${gender}, ${defaultAvatar}
      )
    `

    const users = await sql`SELECT id, email, first_name, last_name, phone, email_verified, created_at FROM users WHERE id = ${id}`
    
    return { user: users[0] as User, error: null }
  } catch (error) {
    console.error('Create user error:', error)
    return { user: null, error: 'Failed to create account' }
  }
}

// Authenticate user (supports email or username)
export async function authenticateUser(identifier: string, password: string): Promise<{ user: User | null; error: string | null }> {
  try {
    // Check if identifier is an email or username
    const isEmail = identifier.includes('@')
    
    let users
    if (isEmail) {
      users = await sql`SELECT * FROM users WHERE email = ${identifier.toLowerCase()}`
    } else {
      users = await sql`SELECT * FROM users WHERE LOWER(username) = ${identifier.toLowerCase()}`
    }
    
    if (users.length === 0) {
      return { user: null, error: 'Invalid email/username or password' }
    }

    const user = users[0]
    const isValid = await verifyPassword(password, user.password_hash)
    
    if (!isValid) {
      return { user: null, error: 'Invalid email/username or password' }
    }

    // Check if account is active
    if (user.is_active === false) {
      return { user: null, error: 'Your account has been suspended. Please contact support.' }
    }

    return { 
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        email_verified: user.email_verified,
        role: user.role || 'user',
        is_active: user.is_active ?? true,
        created_at: user.created_at
      }, 
      error: null 
    }
  } catch (error) {
    console.error('Auth error:', error)
    return { user: null, error: 'Authentication failed' }
  }
}

// Create session
export async function createSession(userId: string, deviceInfo: string, ipAddress: string): Promise<string> {
  const sessionId = uuidv4()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  await sql`
    INSERT INTO sessions (id, user_id, device_info, ip_address, expires_at)
    VALUES (${sessionId}, ${userId}, ${deviceInfo}, ${ipAddress}, ${expiresAt})
  `

  return sessionId
}

// Get session
export async function getSession(sessionId: string): Promise<Session | null> {
  try {
    const sessions = await sql`
      SELECT * FROM sessions 
      WHERE id = ${sessionId} AND expires_at > NOW()
    `
    return sessions[0] as Session || null
  } catch {
    return null
  }
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value
    
    if (!sessionId) return null

    const session = await getSession(sessionId)
    if (!session) return null

    const users = await sql`
      SELECT id, email, first_name, last_name, phone, email_verified, role, is_active, created_at 
      FROM users WHERE id = ${session.user_id}
    `
    
    return users[0] as User || null
  } catch {
    return null
  }
}

// Delete session (logout)
export async function deleteSession(sessionId: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE id = ${sessionId}`
}

// Verify email
export async function verifyEmail(token: string): Promise<boolean> {
  try {
    const result = await sql`
      UPDATE users SET email_verified = true, verification_token = null
      WHERE verification_token = ${token}
      RETURNING id
    `
    return result.length > 0
  } catch {
    return false
  }
}

// Check for new device login
export async function checkNewDevice(userId: string, deviceInfo: string): Promise<boolean> {
  const sessions = await sql`
    SELECT id FROM sessions 
    WHERE user_id = ${userId} AND device_info = ${deviceInfo}
  `
  return sessions.length === 0
}

// Verify hCaptcha
export async function verifyHCaptcha(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `response=${token}&secret=${process.env.HCAPTCHA_SECRET_KEY}`
    })
    const data = await response.json()
    return data.success
  } catch {
    return false
  }
}

// Role checking helpers
export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin'
}

export function isStaff(user: User | null): boolean {
  return user?.role === 'staff'
}

export function isAdminOrStaff(user: User | null): boolean {
  return user?.role === 'admin' || user?.role === 'staff'
}

// Require specific roles - throws if not authorized
export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }
  return user
}

export async function requireStaff(): Promise<User> {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'staff' && user.role !== 'admin')) {
    throw new Error('Unauthorized: Staff access required')
  }
  return user
}

export async function requireAdminOrStaff(): Promise<User> {
  const user = await getCurrentUser()
  if (!user || !['admin', 'staff'].includes(user.role)) {
    throw new Error('Unauthorized: Staff or Admin access required')
  }
  return user
}

// Get user by ID (for admin purposes)
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const users = await sql`
      SELECT id, email, first_name, last_name, phone, email_verified, role, is_active, created_at 
      FROM users WHERE id = ${userId}
    `
    return users[0] as User || null
  } catch {
    return null
  }
}

// Update user role (admin only)
export async function updateUserRole(userId: string, role: 'user' | 'staff' | 'admin'): Promise<boolean> {
  try {
    await sql`UPDATE users SET role = ${role} WHERE id = ${userId}`
    return true
  } catch {
    return false
  }
}

// Toggle user active status (admin only)
export async function toggleUserActive(userId: string, isActive: boolean): Promise<boolean> {
  try {
    await sql`UPDATE users SET is_active = ${isActive} WHERE id = ${userId}`
    return true
  } catch {
    return false
  }
}
