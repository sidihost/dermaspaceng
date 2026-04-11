import { sql } from '@/lib/db'
import * as OTPAuth from 'otpauth'
import crypto from 'crypto'
import QRCode from 'qrcode'

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'DermaSpace'

// Generate a new TOTP secret for a user
export async function generateTOTPSecret(userId: string, userEmail: string): Promise<{
  secret: string
  otpauthUrl: string
  qrCodeUrl: string
}> {
  // Generate a random secret
  const secretBuffer = crypto.randomBytes(20)
  const secret = base32Encode(secretBuffer)

  // Create TOTP instance
  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    label: userEmail,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret)
  })

  const otpauthUrl = totp.toString()

  // Generate QR code as base64 data URI
  const qrCodeUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 200,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  })

  // Store the pending secret (not enabled yet)
  await sql`
    INSERT INTO user_2fa_settings (user_id, totp_secret, totp_enabled, created_at, updated_at)
    VALUES (${userId}, ${secret}, false, NOW(), NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET totp_secret = ${secret}, totp_enabled = false, updated_at = NOW()
  `

  return { secret, otpauthUrl, qrCodeUrl }
}

// Verify a TOTP code and enable 2FA if valid
export async function verifyAndEnable2FA(userId: string, code: string): Promise<{
  verified: boolean
  backupCodes?: string[]
}> {
  // Get the user's secret
  const result = await sql`
    SELECT totp_secret FROM user_2fa_settings WHERE user_id = ${userId}
  `

  if (result.length === 0 || !result[0].totp_secret) {
    return { verified: false }
  }

  const secret = result[0].totp_secret

  // Create TOTP instance and verify
  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret)
  })

  const delta = totp.validate({ token: code, window: 1 })

  if (delta === null) {
    return { verified: false }
  }

  // Generate backup codes
  const backupCodes = generateBackupCodes()
  const hashedBackupCodes = backupCodes.map(code => hashBackupCode(code))

  // Enable 2FA and store backup codes
  await sql`
    UPDATE user_2fa_settings 
    SET totp_enabled = true, backup_codes = ${JSON.stringify(hashedBackupCodes)}, updated_at = NOW()
    WHERE user_id = ${userId}
  `

  // Update user to require 2FA
  await sql`
    UPDATE users SET requires_2fa = true WHERE id = ${userId}
  `

  return { verified: true, backupCodes }
}

// Verify a TOTP code during login
export async function verifyTOTPCode(userId: string, code: string): Promise<boolean> {
  // Get the user's secret
  const result = await sql`
    SELECT totp_secret, backup_codes FROM user_2fa_settings 
    WHERE user_id = ${userId} AND totp_enabled = true
  `

  if (result.length === 0) {
    return false
  }

  const { totp_secret, backup_codes } = result[0]

  // Try TOTP first
  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(totp_secret)
  })

  const delta = totp.validate({ token: code, window: 1 })

  if (delta !== null) {
    return true
  }

  // Try backup codes
  if (backup_codes) {
    const codes = JSON.parse(backup_codes) as string[]
    const hashedInput = hashBackupCode(code.replace(/-/g, ''))
    const codeIndex = codes.findIndex(c => c === hashedInput)

    if (codeIndex !== -1) {
      // Remove used backup code
      codes.splice(codeIndex, 1)
      await sql`
        UPDATE user_2fa_settings 
        SET backup_codes = ${JSON.stringify(codes)}, updated_at = NOW()
        WHERE user_id = ${userId}
      `
      return true
    }
  }

  return false
}

// Disable 2FA for a user
export async function disable2FA(userId: string): Promise<boolean> {
  await sql`
    UPDATE user_2fa_settings 
    SET totp_enabled = false, totp_secret = NULL, backup_codes = NULL, updated_at = NOW()
    WHERE user_id = ${userId}
  `

  await sql`
    UPDATE users SET requires_2fa = false WHERE id = ${userId}
  `

  return true
}

// Get 2FA status for a user
export async function get2FAStatus(userId: string): Promise<{
  isEnabled: boolean
  hasBackupCodes: boolean
  backupCodesRemaining: number
}> {
  const result = await sql`
    SELECT totp_enabled, backup_codes FROM user_2fa_settings WHERE user_id = ${userId}
  `

  if (result.length === 0) {
    return { isEnabled: false, hasBackupCodes: false, backupCodesRemaining: 0 }
  }

  const { totp_enabled, backup_codes } = result[0]
  const codes = backup_codes ? JSON.parse(backup_codes) : []

  return {
    isEnabled: totp_enabled,
    hasBackupCodes: codes.length > 0,
    backupCodesRemaining: codes.length
  }
}

// Regenerate backup codes
export async function regenerateBackupCodes(userId: string): Promise<string[] | null> {
  // Check if 2FA is enabled
  const result = await sql`
    SELECT totp_enabled FROM user_2fa_settings WHERE user_id = ${userId}
  `

  if (result.length === 0 || !result[0].totp_enabled) {
    return null
  }

  const backupCodes = generateBackupCodes()
  const hashedBackupCodes = backupCodes.map(code => hashBackupCode(code))

  await sql`
    UPDATE user_2fa_settings 
    SET backup_codes = ${JSON.stringify(hashedBackupCodes)}, updated_at = NOW()
    WHERE user_id = ${userId}
  `

  return backupCodes
}

// Helper functions
function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
  }
  return codes
}

function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code.replace(/-/g, '')).digest('hex')
}

function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let result = ''
  let bits = 0
  let value = 0

  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8

    while (bits >= 5) {
      bits -= 5
      result += alphabet[(value >>> bits) & 31]
    }
  }

  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31]
  }

  return result
}
