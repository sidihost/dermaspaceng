import { sql } from '@/lib/db'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/types'
import { v4 as uuidv4 } from 'uuid'

// Configuration
const rpName = 'DermaSpace'

// Get the RP ID - must match the domain where passkeys were created
// For production: dermaspaceng.com (without www)
// For staging: the vusercontent.net domain or vercel.app domain
const getAppUrl = () => {
  // Check for production domain first
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  // Check Vercel deployment URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}

const baseUrl = getAppUrl()
const baseHostname = new URL(baseUrl).hostname.replace(/^www\./, '')
const rpID = baseHostname

// Support both www and non-www origins for WebAuthn
const expectedOrigins = baseUrl.includes('localhost') 
  ? [baseUrl, 'http://localhost:3000', 'http://localhost:3001']
  : [`https://${baseHostname}`, `https://www.${baseHostname}`]

console.log('[v0] Passkey config - rpID:', rpID, 'expectedOrigins:', expectedOrigins)

export interface PasskeyCredential {
  id: string
  user_id: string
  credential_id: string
  public_key: string
  counter: number
  name: string
  transports: string[] | null
  created_at: Date
  last_used_at: Date | null
}

// Generate registration options for a user
export async function generatePasskeyRegistrationOptions(userId: string, userEmail: string, userName: string) {
  // Get existing passkeys for the user to exclude them
  const existingCredentials = await sql`
    SELECT credential_id, transports FROM passkey_credentials WHERE user_id = ${userId}
  `

  const excludeCredentials = existingCredentials.map((cred) => ({
    id: Buffer.from(cred.credential_id, 'base64url'),
    type: 'public-key' as const,
    transports: cred.transports as AuthenticatorTransportFuture[] | undefined,
  }))

  console.log('[v0] Passkey registration - rpID:', rpID, 'expectedOrigins:', expectedOrigins)
  
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(userId),
    userName: userEmail,
    userDisplayName: userName,
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      // Allow both platform (Face ID, Touch ID) and cross-platform (security keys) authenticators
    },
  })

  // Store the challenge temporarily (expires in 5 minutes)
  await sql`
    INSERT INTO passkey_challenges (user_id, challenge, expires_at)
    VALUES (${userId}, ${options.challenge}, ${new Date(Date.now() + 5 * 60 * 1000)})
    ON CONFLICT (user_id) DO UPDATE SET challenge = ${options.challenge}, expires_at = ${new Date(Date.now() + 5 * 60 * 1000)}
  `

  return options
}

// Verify and save the registration response
export async function verifyPasskeyRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  deviceName: string = 'My Passkey'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the stored challenge
    const challenges = await sql`
      SELECT challenge FROM passkey_challenges 
      WHERE user_id = ${userId} AND expires_at > NOW()
    `

    if (challenges.length === 0) {
      return { success: false, error: 'Challenge expired. Please try again.' }
    }

    const expectedChallenge = challenges[0].challenge

    console.log('[v0] Verifying registration - expectedOrigins:', expectedOrigins, 'expectedRPID:', rpID)
    
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: expectedOrigins,
      expectedRPID: rpID,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return { success: false, error: 'Verification failed' }
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo

    // Save the credential
    // credential.id is a Uint8Array, convert to base64url string
    // Use the response.id directly as it's already the correct base64url format from the browser
    const credentialIdBase64url = response.id
    const publicKeyBase64url = Buffer.from(credential.publicKey).toString('base64url')
    
    console.log('[v0] Passkey registration - storing credential_id:', credentialIdBase64url)
    
    const id = uuidv4()
    const transportsArray = response.response.transports || []
    await sql`
      INSERT INTO passkey_credentials (
        id, user_id, credential_id, public_key, counter, name, transports, device_type, backed_up
      )
      VALUES (
        ${id},
        ${userId},
        ${credentialIdBase64url},
        ${publicKeyBase64url},
        ${credential.counter},
        ${deviceName},
        ${transportsArray},
        ${credentialDeviceType},
        ${credentialBackedUp}
      )
    `

    // Clean up the challenge
    await sql`DELETE FROM passkey_challenges WHERE user_id = ${userId}`

    return { success: true }
  } catch (error) {
    console.error('[v0] Passkey registration error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to register passkey'
    return { success: false, error: errorMessage }
  }
}

// Generate authentication options (for login)
export async function generatePasskeyAuthOptions(email?: string) {
  let allowCredentials: { id: Uint8Array; type: 'public-key'; transports?: AuthenticatorTransportFuture[] }[] = []
  let userId: string | null = null

  if (email) {
    // Get user and their credentials - support both email and username
    const users = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()} OR username = ${email.toLowerCase()}`
    if (users.length > 0) {
      userId = users[0].id
      const credentials = await sql`
        SELECT credential_id, transports FROM passkey_credentials WHERE user_id = ${userId}
      `
      allowCredentials = credentials.map((cred) => ({
        id: Buffer.from(cred.credential_id, 'base64url'),
        type: 'public-key' as const,
        transports: cred.transports as AuthenticatorTransportFuture[] | undefined,
      }))
    }
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
    userVerification: 'preferred',
  })

  // Always use a unique session ID for the challenge
  // This ensures we can track the challenge even for discoverable credentials
  const sessionId = uuidv4()
  
  await sql`
    INSERT INTO passkey_challenges (user_id, challenge, expires_at)
    VALUES (${sessionId}, ${options.challenge}, ${new Date(Date.now() + 5 * 60 * 1000)})
  `
  
  // If we know the user, also store with their ID for backup matching
  if (userId) {
    await sql`
      INSERT INTO passkey_challenges (user_id, challenge, expires_at)
      VALUES (${userId}, ${options.challenge}, ${new Date(Date.now() + 5 * 60 * 1000)})
      ON CONFLICT (user_id) DO UPDATE SET challenge = ${options.challenge}, expires_at = ${new Date(Date.now() + 5 * 60 * 1000)}
    `
  }

  return { options, challengeId: sessionId }
}

// Helper to decode base64url
function base64urlDecode(str: string): string {
  try {
    return Buffer.from(str, 'base64url').toString('utf8')
  } catch {
    return str
  }
}

// Verify authentication response
export async function verifyPasskeyAuth(
  challengeId: string,
  response: AuthenticationResponseJSON
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    console.log('[v0] Passkey auth - challengeId:', challengeId)
    console.log('[v0] Passkey auth - response.id (credentialId):', response.id)
    console.log('[v0] Passkey auth - rpID:', rpID)
    console.log('[v0] Passkey auth - expectedOrigins:', expectedOrigins)
    
    // First, find the credential to identify the user
    // The credential ID from the browser is base64url encoded
    const credentialId = response.id
    
    // Try exact match first
    let credentials = await sql`
      SELECT * FROM passkey_credentials WHERE credential_id = ${credentialId}
    `
    
    // If not found, the stored credential might be double-encoded
    // Try encoding the incoming ID to base64url to match double-encoded stored value
    if (credentials.length === 0) {
      const doubleEncodedId = Buffer.from(credentialId).toString('base64url')
      console.log('[v0] Passkey auth - Trying double-encoded match:', doubleEncodedId.substring(0, 30))
      credentials = await sql`
        SELECT * FROM passkey_credentials WHERE credential_id = ${doubleEncodedId}
      `
      
      // If found with double encoding, fix the stored credential for future logins
      if (credentials.length > 0) {
        console.log('[v0] Passkey auth - Found with double-encoding, fixing stored credential')
        await sql`
          UPDATE passkey_credentials 
          SET credential_id = ${credentialId}
          WHERE id = ${credentials[0].id}
        `
        // Update the credential object to use the correct ID for verification
        credentials[0].credential_id = credentialId
      }
    }
    
    // If not found, try with rawId as fallback (some browsers use rawId)
    if (credentials.length === 0 && response.rawId && response.rawId !== response.id) {
      console.log('[v0] Passkey auth - Trying rawId as fallback:', response.rawId)
      credentials = await sql`
        SELECT * FROM passkey_credentials WHERE credential_id = ${response.rawId}
      `
    }

    if (credentials.length === 0) {
      // Log all stored credentials for debugging (only use guaranteed columns)
      const allCredentials = await sql`SELECT credential_id, user_id FROM passkey_credentials LIMIT 10`
      console.log('[v0] Passkey auth - No credential found. Looking for:', credentialId)
      console.log('[v0] Passkey auth - Stored credentials:', JSON.stringify(allCredentials.map(c => ({ id: c.credential_id?.substring(0, 30) + '...' }))))
      return { success: false, error: 'Passkey not found. Please try signing in with your password and re-register your passkey.' }
    }
    
    const credential = credentials[0]
    console.log('[v0] Passkey auth - Found credential for user:', credential.user_id)
    
    // Now get the challenge - try session ID first, then user ID
    let challenges = await sql`
      SELECT challenge FROM passkey_challenges 
      WHERE user_id = ${challengeId} AND expires_at > NOW()
    `
    
    // If no challenge found with session ID, try with user ID
    if (challenges.length === 0) {
      console.log('[v0] Passkey auth - No challenge found with sessionId, trying userId:', credential.user_id)
      challenges = await sql`
        SELECT challenge FROM passkey_challenges 
        WHERE user_id = ${credential.user_id} AND expires_at > NOW()
      `
    }

    if (challenges.length === 0) {
      console.log('[v0] Passkey auth - No valid challenge found')
      return { success: false, error: 'Challenge expired. Please try again.' }
    }

    const expectedChallenge = challenges[0].challenge
    console.log('[v0] Passkey auth - Found challenge, proceeding to verify')

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: expectedOrigins,
      expectedRPID: rpID,
      credential: {
        id: Buffer.from(credential.credential_id, 'base64url'),
        publicKey: Buffer.from(credential.public_key, 'base64url'),
        counter: credential.counter,
        transports: credential.transports as AuthenticatorTransportFuture[] | undefined,
      },
    })

    if (!verification.verified) {
      console.log('[v0] Passkey auth - Verification failed for credential:', credential.name)
      return { success: false, error: 'Authentication failed. The passkey verification was unsuccessful.' }
    }
    
    console.log('[v0] Passkey auth - Verification successful!')

    // Update counter and last used
    await sql`
      UPDATE passkey_credentials 
      SET counter = ${verification.authenticationInfo.newCounter}, last_used_at = NOW()
      WHERE id = ${credential.id}
    `

    // Clean up challenges (both session ID and user ID)
    await sql`DELETE FROM passkey_challenges WHERE user_id = ${challengeId} OR user_id = ${credential.user_id}`

    // Get user to check if active
    const users = await sql`SELECT id, is_active FROM users WHERE id = ${credential.user_id}`
    if (users.length === 0 || users[0].is_active === false) {
      return { success: false, error: 'Account not found or suspended' }
    }

    return { success: true, userId: credential.user_id }
  } catch (error) {
    console.error('[v0] Passkey auth error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Provide more specific error messages
    if (errorMessage.includes('origin')) {
      return { success: false, error: 'Origin mismatch. Please ensure you are on the correct domain.' }
    }
    if (errorMessage.includes('rpID') || errorMessage.includes('RP ID')) {
      return { success: false, error: 'Domain mismatch. The passkey may have been created on a different domain.' }
    }
    if (errorMessage.includes('challenge')) {
      return { success: false, error: 'Challenge verification failed. Please try again.' }
    }
    
    return { success: false, error: 'Authentication failed. Please try signing in with your password.' }
  }
}

// Get user's passkeys
export async function getUserPasskeys(userId: string): Promise<PasskeyCredential[]> {
  const passkeys = await sql`
    SELECT id, user_id, credential_id, name, created_at, last_used_at
    FROM passkey_credentials
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `
  return passkeys as PasskeyCredential[]
}

// Delete a passkey
export async function deletePasskey(userId: string, passkeyId: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM passkey_credentials 
    WHERE id = ${passkeyId} AND user_id = ${userId}
    RETURNING id
  `
  return result.length > 0
}

// Rename a passkey
export async function renamePasskey(userId: string, passkeyId: string, newName: string): Promise<boolean> {
  const result = await sql`
    UPDATE passkey_credentials 
    SET name = ${newName}
    WHERE id = ${passkeyId} AND user_id = ${userId}
    RETURNING id
  `
  return result.length > 0
}

// Check if user has any passkeys
export async function hasPasskeys(userId: string): Promise<boolean> {
  const result = await sql`
    SELECT COUNT(*) as count FROM passkey_credentials WHERE user_id = ${userId}
  `
  return parseInt(result[0].count) > 0
}
