import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

async function createAdminUser() {
  const databaseUrl = process.env.DATABASE_URL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set')
    process.exit(1)
  }

  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable is not set')
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  try {
    // Check if admin user already exists
    const existing = await sql`SELECT id FROM users WHERE username = 'admin234' OR email = 'admin@dermaspace.ng'`
    
    if (existing.length > 0) {
      console.log('Admin user already exists. Updating password...')
      const passwordHash = await bcrypt.hash(adminPassword, 12)
      await sql`
        UPDATE users 
        SET password_hash = ${passwordHash}, role = 'admin'
        WHERE username = 'admin234' OR email = 'admin@dermaspace.ng'
      `
      console.log('Admin password updated successfully!')
      return
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(adminPassword, 12)

    // Create admin user
    await sql`
      INSERT INTO users (
        email,
        password_hash,
        first_name,
        last_name,
        username,
        role,
        email_verified,
        profile_completed,
        created_at,
        updated_at
      ) VALUES (
        'admin@dermaspace.ng',
        ${passwordHash},
        'Admin',
        'User',
        'admin234',
        'admin',
        true,
        true,
        NOW(),
        NOW()
      )
    `

    console.log('Admin user created successfully!')
    console.log('Email: admin@dermaspace.ng')
    console.log('Username: admin234')
    console.log('Password: (from ADMIN_PASSWORD env variable)')
  } catch (error) {
    console.error('Error creating admin user:', error)
    process.exit(1)
  }
}

createAdminUser()
