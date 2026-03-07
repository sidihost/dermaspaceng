const ZEPTO_API_KEY = process.env.ZEPTO_MAIL_API_KEY
const FROM_EMAIL = 'no-reply@dermaspaceng.com'
const FROM_NAME = 'Dermaspace'

interface EmailOptions {
  to: string
  subject: string
  html: string
}

// Base email template
function getEmailTemplate(content: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dermaspace</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f8f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f8f8;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; text-align: center; border-bottom: 1px solid #f0f0f0;">
              <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/415302924_1075146177064225_6577577843482783337_n.png-e95maF9TCmUwX5S85lZBjxTzCvbVuH.webp" alt="Dermaspace" width="60" style="display: block; margin: 0 auto 12px;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #7B2D8E;">Dermaspace</h1>
              <p style="margin: 4px 0 0; font-size: 11px; color: #888; letter-spacing: 1px; text-transform: uppercase;">Esthetic & Wellness Centre</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #f0f0f0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px; font-size: 12px; color: #666;">
                      Victoria Island: 237b Muri Okunola St, Lagos
                    </p>
                    <p style="margin: 0 0 16px; font-size: 12px; color: #666;">
                      Ikoyi: 44A, Awolowo Road, Lagos
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #999;">
                      &copy; ${new Date().getFullYear()} Dermaspace. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

// Send email via Zepto Mail
async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  try {
    const response = await fetch('https://api.zeptomail.com/v1.1/email', {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-enczapikey ${ZEPTO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: { address: FROM_EMAIL, name: FROM_NAME },
        to: [{ email_address: { address: to } }],
        subject,
        htmlbody: html
      })
    })
    return response.ok
  } catch (error) {
    console.error('Email send error:', error)
    return false
  }
}

// Email verification
export async function sendVerificationEmail(email: string, firstName: string, token: string): Promise<boolean> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`
  
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Verify Your Email</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${firstName},<br><br>
      Welcome to Dermaspace! Please verify your email address to complete your registration and start booking appointments.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 8px;">
          <a href="${verifyUrl}" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            Verify Email Address
          </a>
        </td>
      </tr>
    </table>
    <p style="margin: 0; font-size: 13px; color: #888;">
      This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
    </p>
  `
  
  return sendEmail({
    to: email,
    subject: 'Verify Your Email - Dermaspace',
    html: getEmailTemplate(content)
  })
}

// Consultation confirmation
export async function sendConsultationConfirmation(data: {
  email: string
  firstName: string
  location: string
  date: string
  time: string
}): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Consultation Requested</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      Thank you for requesting a consultation with Dermaspace. Our team will review your request and confirm your appointment within 24 hours.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f8f5fa; border-radius: 12px; padding: 20px;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #7B2D8E; text-transform: uppercase; letter-spacing: 1px;">Appointment Details</h3>
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666; width: 100px;">Location:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.location}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Date:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Time:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.time}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      If you need to reschedule or cancel, please contact us at info@dermaspaceng.com or call +234 816 776 4757.
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: 'Consultation Request Received - Dermaspace',
    html: getEmailTemplate(content)
  })
}

// New device login alert
export async function sendNewDeviceAlert(data: {
  email: string
  firstName: string
  deviceInfo: string
  ipAddress: string
  location: string
}): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">New Login Detected</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      We detected a new login to your Dermaspace account from a device we don't recognize.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #fff8e6; border-radius: 12px; border: 1px solid #f0d78c;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #856404;">Login Details</h3>
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 6px 0; font-size: 14px; color: #666; width: 100px;">Device:</td>
              <td style="padding: 6px 0; font-size: 14px; color: #1a1a1a;">${data.deviceInfo}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 14px; color: #666;">IP Address:</td>
              <td style="padding: 6px 0; font-size: 14px; color: #1a1a1a;">${data.ipAddress}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 14px; color: #666;">Location:</td>
              <td style="padding: 6px 0; font-size: 14px; color: #1a1a1a;">${data.location}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      If this was you, you can ignore this email. If you didn't log in, please change your password immediately and contact us.
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: 'New Login to Your Account - Dermaspace',
    html: getEmailTemplate(content)
  })
}

// Booking confirmation
export async function sendBookingConfirmation(data: {
  email: string
  firstName: string
  service: string
  location: string
  date: string
  time: string
  amount: string
}): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Booking Confirmed!</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      Your appointment has been confirmed. We look forward to seeing you!
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #166534; text-transform: uppercase; letter-spacing: 1px;">Booking Details</h3>
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666; width: 100px;">Service:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.service}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Location:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.location}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Date:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Time:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.time}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Amount:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #7B2D8E; font-weight: 600;">${data.amount}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      Please arrive 10 minutes before your appointment. For cancellations or rescheduling, contact us at least 24 hours in advance.
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: 'Appointment Confirmed - Dermaspace',
    html: getEmailTemplate(content)
  })
}
