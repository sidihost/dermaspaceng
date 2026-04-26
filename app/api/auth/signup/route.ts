import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createUser, verifyHCaptcha } from '@/lib/auth'
import { sendVerificationEmail } from '@/lib/email'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { neon } from '@neondatabase/serverless'
import { evaluatePassword } from '@/lib/password-strength'
import { isPasswordPwned } from '@/lib/password-breach'
import { appendAuditEvent } from '@/lib/auth-audit'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    // Admin kill-switch — when "New account signups" is OFF in
    // /admin/features, every fresh registration request is rejected
    // at the API boundary. Existing users can still sign in; only
    // new account creation is paused. Returns 503 (rather than 403)
    // so the client UI can show a generic "temporarily unavailable"
    // message — the same shape we use for maintenance mode.
    if (!(await isFeatureEnabled('signups'))) {
      return NextResponse.json(
        { error: 'New signups are temporarily unavailable. Please check back soon.' },
        { status: 503 },
      )
    }

    const body = await request.json()
    const { firstName, lastName, email, phone, password, captchaToken, dateOfBirth, gender } = body

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // DOB is optional, but if supplied validate it: must be a real date, not
    // in the future, and the user must be at least 13 (standard COPPA floor).
    let normalizedDob: string | null = null
    if (dateOfBirth && typeof dateOfBirth === 'string' && dateOfBirth.trim() !== '') {
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
        return NextResponse.json({ error: 'You must be at least 13 years old to sign up' }, { status: 400 })
      }
      normalizedDob = dateOfBirth
    }

    // ── Password strength gate ─────────────────────────────────────
    // Server-side enforcement of the same scoring shown to the user
    // in the strength meter. We refuse to create an account with a
    // "weak" password (score < 2) even if the client allowed it,
    // and feed personal terms (name, email local-part) into the
    // evaluator so passwords like "Mill1234" / "millfasanmi@..."
    // fail before they ever touch bcrypt.
    const personalTerms = [firstName, lastName, String(email || '').split('@')[0]].filter(Boolean)
    const evaluation = evaluatePassword(String(password || ''), personalTerms)
    if (evaluation.score < 2 || evaluation.failedRequirements.length > 0) {
      return NextResponse.json(
        {
          error:
            evaluation.failedRequirements[0] ||
            'Please choose a stronger password (at least Fair strength).',
          strength: { score: evaluation.score, label: evaluation.label },
        },
        { status: 400 },
      )
    }

    // ── Breach corpus check (HaveIBeenPwned k-anonymity) ──────────
    // Only the first 5 chars of the SHA-1 ever leave the server, and
    // the request is server-side so the user's IP is hidden. Fails
    // open on network errors so a transient outage doesn't block
    // signups — strength scoring already covers the floor.
    const pwned = await isPasswordPwned(String(password || ''))
    if (pwned.pwned && pwned.count >= 100) {
      return NextResponse.json(
        {
          error:
            'This password has appeared in known data breaches. Please choose a different one for your safety.',
        },
        { status: 400 },
      )
    }

    // Verify hCaptcha
    if (process.env.HCAPTCHA_SECRET_KEY) {
      const captchaValid = await verifyHCaptcha(captchaToken)
      if (!captchaValid) {
        return NextResponse.json(
          { error: 'Captcha verification failed' },
          { status: 400 }
        )
      }
    }

    // Gender is required at signup so we can pick a matching default
    // avatar. Only 'male' / 'female' are accepted — this is purely a
    // personalization signal for the avatar pool and nothing else.
    if (gender !== 'male' && gender !== 'female') {
      return NextResponse.json(
        { error: 'Please select your gender so we can personalize your profile.' },
        { status: 400 },
      )
    }

    // Create user
    const { user, error } = await createUser({
      email,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth: normalizedDob,
      gender,
    })

    if (error || !user) {
      return NextResponse.json(
        { error: error || 'Failed to create account' },
        { status: 400 }
      )
    }

    // Get verification token
    const users = await sql`SELECT verification_token FROM users WHERE id = ${user.id}`
    const verificationToken = users[0]?.verification_token

    // Send verification email
    if (verificationToken) {
      await sendVerificationEmail(email, firstName, verificationToken)
    }

    // ── Audit ledger: append the signup event ──────────────────────
    // We record IP and UA here so an admin can later investigate any
    // chain of events touching this account. `appendAuditEvent`
    // serialises through an advisory lock so the chain stays linear
    // even under concurrent signups.
    try {
      const h = await headers()
      await appendAuditEvent({
        eventType: 'signup',
        userId: user.id,
        ipAddress: (h.get('x-forwarded-for') || '').split(',')[0] || null,
        userAgent: h.get('user-agent') || null,
        eventData: { method: 'email', strength: evaluation.label },
      })
    } catch (auditErr) {
      // Auditing must never block a successful signup; we log and
      // move on. The chain remains valid because we simply skip
      // appending — we don't write a half-formed row.
      console.error('[v0] signup audit append failed:', auditErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Account created. Please check your email to verify.'
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
