import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function checkDatabase() {
  try {
    // Check table structure
    console.log('=== Users Table Schema ===');
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;
    console.table(columns);

    // Check sample users
    console.log('\n=== Sample Users (first 5) ===');
    const users = await sql`
      SELECT id, first_name, last_name, username, email, created_at
      FROM users 
      ORDER BY created_at DESC
      LIMIT 5
    `;
    console.table(users);

    // Check how many users have usernames
    console.log('\n=== Username Stats ===');
    const stats = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT(username) as users_with_username,
        COUNT(*) - COUNT(username) as users_without_username
      FROM users
    `;
    console.table(stats);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDatabase();
