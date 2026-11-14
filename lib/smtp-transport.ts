import nodemailer from 'nodemailer'

export interface SmtpTransportLike {
  sendMail: (mail: {
    from: string
    to: string
    subject: string
    html: string
  }) => Promise<unknown>
  close?: () => void
}

export type SmtpTransporterFactory = (password: string) => SmtpTransportLike

export function createZeptoTransporter(password: string): SmtpTransportLike {
  return nodemailer.createTransport({
    host: 'smtp.zeptomail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'emailapikey',
      pass: password,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    tls: {
      rejectUnauthorized: true,
    },
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Send a transactional email using a fresh ZeptoMail SMTP connection with
 * bounded timeouts and one automatic retry on transient socket/TLS failure.
 */
export async function sendMailWithRetry(opts: {
  password?: string
  from: string
  to: string
  subject: string
  html: string
  maxAttempts?: number
  retryDelayMs?: number
  createTransport?: SmtpTransporterFactory
}): Promise<boolean> {
  if (!opts.password) {
    console.error('ZEPTO_MAIL_PASSWORD not configured')
    return false
  }

  const maxAttempts = Math.max(1, opts.maxAttempts ?? 2)
  const retryDelayMs = Math.max(0, opts.retryDelayMs ?? 250)
  const createTransport = opts.createTransport ?? createZeptoTransporter

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const transporter = createTransport(opts.password)
    try {
      await transporter.sendMail({
        from: opts.from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      })
      return true
    } catch (error) {
      console.error(
        `[smtp-transport] sendMail failed (attempt ${attempt}/${maxAttempts}) for ${opts.subject}:`,
        error,
      )
      if (attempt < maxAttempts && retryDelayMs > 0) {
        await sleep(retryDelayMs)
      }
    } finally {
      try {
        transporter.close?.()
      } catch {
        // Ignore close errors
      }
    }
  }

  return false
}
