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
const rpID = process.env.NEXT_PUBLIC_APP_URL 
  ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname 
  : 'localhost'
const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export interface PasskeyCredential {
  id: string
  user_id: string
  credential_id: string
  public_key: string
  counter: number
  device_name: string
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
      authenticatorAttachment: 'platform',
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

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return { success: false, error: 'Verification failed' }
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo

    // Save the credential
    const id = uuidv4()
    await sql`
      INSERT INTO passkey_credentials (
        id, user_id, credential_id, public_key, counter, device_name, transports, device_type, backed_up
      )
      VALUES (
        ${id},
        ${userId},
        ${Buffer.from(credential.id).toString('base64url')},
        ${Buffer.from(credential.publicKey).toString('base64url')},
        ${credential.counter},
        ${deviceName},
        ${JSON.stringify(response.response.transports || [])},
        ${credentialDeviceType},
        ${credentialBackedUp}
      )
    `

    // Clean up the challenge
    await sql`DELETE FROM passkey_challenges WHERE user_id = ${userId}`

    return { success: true }
  } catch (error) {
    console.error('Passkey registration error:', error)
    return { success: false, error: 'Failed to register passkey' }
  }
}

// Generate authentication options (for login)
export async function generatePasskeyAuthOptions(email?: string) {
  let allowCredentials: { id: Uint8Array; type: 'public-key'; transports?: AuthenticatorTransportFuture[] }[] = []
  let userId: string | null = null

  if (email) {
    // Get user and their credentials
    const users = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`
    if (users.length > 0) {
      userId = users[0].id
      const credentials = await sql`
        SELECT credential_id, transports FROM passkey_credentials WHERE user_id = ${userId}
      `
      allowCredentials = credentials.map((cred) => ({
        id: Buffer.from(cred.credential_id, 'base64url'),
        type: 'public-key' as const,
        transports: cred.transports ? JSON.parse(cred.transports) : undefined,
      }))
    }
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
    userVerification: 'preferred',
  })

  // Store challenge (use a temporary session ID if no user)
  const challengeId = userId || uuidv4()
  await sql`
    INSERT INTO passkey_challenges (user_id, challenge, expires_at)
    VALUES (${challengeId}, ${options.challenge}, ${new Date(Date.now() + 5 * 60 * 1000)})
    ON CONFLICT (user_id) DO UPDATE SET challenge = ${options.challenge}, expires_at = ${new Date(Date.now() + 5 * 60 * 1000)}
  `

  return { options, challengeId }
}

// Verify authentication response
export async function verifyPasskeyAuth(
  challengeId: string,
  response: AuthenticationResponseJSON
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    // Get the stored challenge
    const challenges = await sql`
      SELECT challenge FROM passkey_challenges 
      WHERE user_id = ${challengeId} AND expires_at > NOW()
    `

    if (challenges.length === 0) {
      return { success: false, error: 'Challenge expired. Please try again.' }
    }

    const expectedChallenge = challenges[0].challenge

    // Find the credential
    const credentialId = response.id
    const credentials = await sql`
      SELECT * FROM passkey_credentials WHERE credential_id = ${credentialId}
    `

    if (credentials.length === 0) {
      return { success: false, error: 'Passkey not found' }
    }

    const credential = credentials[0]

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: Buffer.from(credential.credential_id, 'base64url'),
        publicKey: Buffer.from(credential.public_key, 'base64url'),
        counter: credential.counter,
        transports: credential.transports ? JSON.parse(credential.transports) : undefined,
      },
    })

    if (!verification.verified) {
      return { success: false, error: 'Authentication failed' }
    }

    // Update counter and last used
    await sql`
      UPDATE passkey_credentials 
      SET counter = ${verification.authenticationInfo.newCounter}, last_used_at = NOW()
      WHERE id = ${credential.id}
    `

    // Clean up challenge
    await sql`DELETE FROM passkey_challenges WHERE user_id = ${challengeId}`

    // Get user to check if active
    const users = await sql`SELECT id, is_active FROM users WHERE id = ${credential.user_id}`
    if (users.length === 0 || users[0].is_active === false) {
      return { success: false, error: 'Account not found or suspended' }
    }

    return { success: true, userId: credential.user_id }
  } catch (error) {
    console.error('Passkey auth error:', error)
    return { success: false, error: 'Authentication failed' }
  }
}

// Get user's passkeys
export async function getUserPasskeys(userId: string): Promise<PasskeyCredential[]> {
  const passkeys = await sql`
    SELECT id, user_id, credential_id, device_name, created_at, last_used_at
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
    SET device_name = ${newName}
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
