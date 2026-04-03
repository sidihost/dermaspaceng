import nodemailer from 'nodemailer'

const SMTP_PASSWORD = process.env.ZEPTO_MAIL_PASSWORD
const FROM_EMAIL = 'hello@dermaspaceng.com'
const FROM_NAME = 'Dermaspace'

// Create SMTP transporter for Zepto Mail
// Username for Zepto Mail SMTP is "emailapikey", password is your SendMail token
const transporter = nodemailer.createTransport({
  host: 'smtp.zeptomail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'emailapikey',
    pass: SMTP_PASSWORD
  }
})

interface EmailOptions {
  to: string
  subject: string
  html: string
}

// Brand color
const BRAND_COLOR = '#7B2D8E'

// Base email template - Clean, full-width design like Facebook
function getEmailTemplate(content: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dermaspace</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 16px 24px; border-bottom: 1px solid #e5e5e5;">
              <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-94H8PDF6ZUmAswlgJGdWKBbrORio8Y.webp" alt="Dermaspace Esthetic And Wellness Centre" width="280" height="auto" style="display: block; max-width: 280px; height: auto;" />
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px; border-top: 1px solid #e5e5e5;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px; font-size: 12px; color: #65676b; line-height: 1.5;">
                      Victoria Island: 237b Muri Okunola St, Lagos<br>
                      Ikoyi: 44A, Awolowo Road, Lagos
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #65676b;">
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

// Send email via Zepto Mail SMTP
async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  if (!SMTP_PASSWORD) {
    console.error('ZEPTO_MAIL_PASSWORD not configured')
    return false
  }
  
  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html
    })
    
    return true
  } catch (error) {
    console.error('Email send error:', error)
    return false
  }
}

// Email verification - Clean design like Facebook
export async function sendVerificationEmail(email: string, firstName: string, token: string): Promise<boolean> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`
  
  const content = `
    <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 400; color: #1c1e21; line-height: 1.2;">One more step to sign up</h1>
    
    <p style="margin: 0 0 24px; font-size: 16px; color: #1c1e21; line-height: 1.5;">
      Hi ${firstName},
    </p>
    
    <p style="margin: 0 0 24px; font-size: 16px; color: #1c1e21; line-height: 1.5;">
      We got your request to create an account. Click the button below to verify your email:
    </p>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;" width="100%">
      <tr>
        <td>
          <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; background-color: ${BRAND_COLOR}; border-radius: 6px;">
            Verify Email
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0 0 8px; font-size: 14px; color: #65676b; line-height: 1.5;">
      This link will expire in 24 hours.
    </p>
    
    <p style="margin: 0; font-size: 14px; color: #65676b; line-height: 1.5;">
      If you didn&apos;t request this, you can safely ignore this email.
    </p>
    
    <p style="margin: 24px 0 0; font-size: 14px; color: #1c1e21; line-height: 1.5;">
      Thanks,<br>
      Dermaspace Team
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

// Gift card request to admin
export async function sendGiftCardRequestToAdmin(data: {
  amount: number
  design: string
  designName?: string
  designGradient?: string
  occasion: string
  font: string
  fontName?: string
  recipientName: string
  recipientEmail: string
  recipientPhone: string
  senderName: string
  senderEmail: string
  personalMessage: string
  deliveryMethod: string
  deliveryDate: string
}): Promise<boolean> {
  // Safely handle values that could be undefined
  const displayDesignName = data.designName || data.design || 'Not specified'
  const displayFontName = data.fontName || data.font || 'Not specified'
  const displayRecipientEmail = data.recipientEmail || 'Not provided'
  const displaySenderName = data.senderName || 'Not provided'
  const displaySenderEmail = data.senderEmail || 'Not provided'
  const displayOccasion = data.occasion || 'Not specified'
  const displayDeliveryMethod = data.deliveryMethod || 'Email'

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">New Gift Card Request</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      A new gift card request has been submitted. Please review the details below and process the order.
    </p>
    
    <!-- Gift Card Visual Preview -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 16px;">
      <tr>
        <td style="padding: 24px; background: linear-gradient(135deg, #7B2D8E 0%, #9B4DB0 100%); border-radius: 16px; text-align: center;">
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
            <tr>
              <td style="padding: 12px 20px; background-color: rgba(255,255,255,0.95); border-radius: 20px;">
                <span style="font-weight: 700; color: #7B2D8E; font-size: 14px;">Dermaspace</span>
              </td>
              <td style="width: 16px;"></td>
              <td style="padding: 8px 16px; background-color: rgba(255,255,255,0.2); border-radius: 20px; border: 1px solid rgba(255,255,255,0.3);">
                <span style="font-weight: 700; color: #ffffff; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Gift Card</span>
              </td>
            </tr>
          </table>
          <p style="margin: 20px 0 8px; color: rgba(255,255,255,0.8); font-size: 12px;">For: <strong style="color: #ffffff;">${data.recipientName || 'Recipient'}</strong></p>
          <p style="margin: 0 0 8px; color: rgba(255,255,255,0.7); font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Amount</p>
          <p style="margin: 0 0 16px; color: #ffffff; font-size: 36px; font-weight: 700;">N${data.amount.toLocaleString()}</p>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
            <tr>
              <td style="padding: 6px 12px; background-color: rgba(255,255,255,0.15); border-radius: 20px;">
                <span style="color: #ffffff; font-size: 11px;">${displayOccasion}</span>
              </td>
              <td style="width: 12px;"></td>
              <td>
                <span style="color: rgba(255,255,255,0.8); font-size: 12px;">From: <strong style="color: #ffffff;">${displaySenderName}</strong></span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 16px; background-color: #f8f5fa; border-radius: 12px;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #7B2D8E; text-transform: uppercase;">Gift Card Details</h3>
          <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666; width: 140px;">Amount:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #7B2D8E; font-weight: 600;">N${data.amount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Card Design:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${displayDesignName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Occasion:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${displayOccasion}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Font Style:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${displayFontName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Delivery Method:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${displayDeliveryMethod}</td>
            </tr>
            ${data.deliveryDate ? `<tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Delivery Date:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${data.deliveryDate}</td>
            </tr>` : ''}
          </table>
        </td>
      </tr>
    </table>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 16px; background-color: #f0f9ff; border-radius: 12px;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #0369a1; text-transform: uppercase;">Recipient Information</h3>
          <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666; width: 140px;">Name:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.recipientName || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Email:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${displayRecipientEmail}</td>
            </tr>
            ${data.recipientPhone ? `<tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Phone:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${data.recipientPhone}</td>
            </tr>` : ''}
          </table>
        </td>
      </tr>
    </table>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 16px; background-color: #fef3c7; border-radius: 12px;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #92400e; text-transform: uppercase;">Sender Information</h3>
          <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666; width: 140px;">Name:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${displaySenderName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Email:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${displaySenderEmail}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    ${data.personalMessage ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 16px; background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #374151;">Personal Message</h3>
          <p style="margin: 0; font-size: 14px; color: #4b5563; font-style: italic;">"${data.personalMessage}"</p>
        </td>
      </tr>
    </table>
    ` : ''}
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      Please process this request and send payment instructions to the sender at ${displaySenderEmail}.
    </p>
  `
  
  return sendEmail({
    to: 'admin@dermaspaceng.com',
    subject: `New Gift Card Request - N${data.amount.toLocaleString()} - ${displaySenderName}`,
    html: getEmailTemplate(content)
  })
}

// Gift card confirmation to user
export async function sendGiftCardConfirmation(data: {
  userEmail: string
  userName: string
  amount: number
  recipientName: string
  occasion: string
  designName?: string
}): Promise<boolean> {
  // Safely handle undefined values
  const displayUserName = data.userName || 'Valued Customer'
  const displayRecipientName = data.recipientName || 'Recipient'
  const displayOccasion = data.occasion || 'Special Occasion'
  const displayDesignName = data.designName || 'Custom Design'

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Gift Card Request Received!</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${displayUserName},<br><br>
      Thank you for your gift card request! We've received your order and our team will process it shortly.
    </p>
    
    <!-- Gift Card Visual Preview -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="padding: 20px; background: linear-gradient(135deg, #7B2D8E 0%, #9B4DB0 100%); border-radius: 12px; text-align: center;">
          <p style="margin: 0 0 4px; color: rgba(255,255,255,0.8); font-size: 11px;">Gift Card for</p>
          <p style="margin: 0 0 12px; color: #ffffff; font-size: 16px; font-weight: 600;">${displayRecipientName}</p>
          <p style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">N${data.amount.toLocaleString()}</p>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.7); font-size: 12px;">${displayOccasion}</p>
        </td>
      </tr>
    </table>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #166534; text-transform: uppercase;">Order Summary</h3>
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666; width: 120px;">Gift Card Value:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #7B2D8E; font-weight: 600;">N${data.amount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Recipient:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${displayRecipientName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Occasion:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${displayOccasion}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Card Design:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${displayDesignName}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #1a1a1a;">What&apos;s Next?</h3>
    <ol style="margin: 0 0 24px; padding-left: 20px; font-size: 14px; color: #4a4a4a; line-height: 1.8;">
      <li>Our team will review your gift card design</li>
      <li>You&apos;ll receive payment instructions via email</li>
      <li>Once payment is confirmed, the gift card will be created</li>
      <li>The gift card will be delivered according to your preference</li>
    </ol>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      If you have any questions, please contact us at hello@dermaspaceng.com or call +234 901 797 2919.
    </p>
  `
  
  return sendEmail({
    to: data.userEmail,
    subject: 'Gift Card Request Confirmed - Dermaspace',
    html: getEmailTemplate(content)
  })
}

// General form submission confirmation
export async function sendFormConfirmation(data: {
  email: string
  firstName: string
  formType: string
  details: Record<string, string>
}): Promise<boolean> {
  const detailsHtml = Object.entries(data.details)
    .map(([key, value]) => `
      <tr>
        <td style="padding: 8px 0; font-size: 14px; color: #666; width: 140px;">${key}:</td>
        <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${value}</td>
      </tr>
    `).join('')

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Submission Received</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      Thank you for your ${data.formType}. We've received your submission and will get back to you soon.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f8f5fa; border-radius: 12px;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #7B2D8E; text-transform: uppercase;">Submission Details</h3>
          <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
            ${detailsHtml}
          </table>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      Our team typically responds within 24-48 hours. For urgent inquiries, please call us at +234 901 797 2919.
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: `${data.formType} Received - Dermaspace`,
    html: getEmailTemplate(content)
  })
}

// Payment receipt email for gift cards (Paystack integration ready)
export async function sendGiftCardPaymentReceipt(data: {
  userEmail: string
  userName: string
  amount: number
  recipientName: string
  occasion: string
  designName: string
  transactionRef: string
  paymentDate: string
}): Promise<boolean> {
  const displayUserName = data.userName || 'Valued Customer'
  const displayRecipientName = data.recipientName || 'Recipient'
  const displayOccasion = data.occasion || 'Special Occasion'
  const displayDesignName = data.designName || 'Custom Design'

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Payment Confirmed!</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${displayUserName},<br><br>
      Your payment for the gift card has been successfully processed. We are now creating your beautiful gift card!
    </p>
    
    <!-- Success Badge -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="text-align: center;">
          <div style="display: inline-block; width: 64px; height: 64px; background-color: #dcfce7; border-radius: 50%; line-height: 64px; text-align: center;">
            <span style="color: #16a34a; font-size: 28px;">&#10003;</span>
          </div>
        </td>
      </tr>
    </table>
    
    <!-- Gift Card Visual Preview -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="padding: 20px; background: linear-gradient(135deg, #7B2D8E 0%, #9B4DB0 100%); border-radius: 12px; text-align: center;">
          <p style="margin: 0 0 4px; color: rgba(255,255,255,0.8); font-size: 11px;">Gift Card for</p>
          <p style="margin: 0 0 12px; color: #ffffff; font-size: 16px; font-weight: 600;">${displayRecipientName}</p>
          <p style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">N${data.amount.toLocaleString()}</p>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.7); font-size: 12px;">${displayOccasion}</p>
        </td>
      </tr>
    </table>
    
    <!-- Payment Receipt -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f8f5fa; border-radius: 12px;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #7B2D8E; text-transform: uppercase;">Payment Receipt</h3>
          <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666; width: 140px;">Amount Paid:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #7B2D8E; font-weight: 600;">N${data.amount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Transaction Ref:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-family: monospace;">${data.transactionRef}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Payment Date:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${data.paymentDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Card Design:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${displayDesignName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Recipient:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${displayRecipientName}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #1a1a1a;">What&apos;s Next?</h3>
    <ol style="margin: 0 0 24px; padding-left: 20px; font-size: 14px; color: #4a4a4a; line-height: 1.8;">
      <li>Our design team will create your custom gift card</li>
      <li>The gift card will be delivered within 24 hours</li>
      <li>You&apos;ll receive a notification when it&apos;s ready</li>
    </ol>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      Keep this email as your payment receipt. If you have any questions, please contact us at hello@dermaspaceng.com or call +234 901 797 2919.
    </p>
  `
  
  return sendEmail({
    to: data.userEmail,
    subject: 'Payment Confirmed - Gift Card Order - Dermaspace',
    html: getEmailTemplate(content)
  })
}

// Payment cancelled email
export async function sendGiftCardPaymentCancelled(data: {
  userEmail: string
  userName: string
  amount: number
  recipientName: string
}): Promise<boolean> {
  const displayUserName = data.userName || 'Valued Customer'
  const displayRecipientName = data.recipientName || 'Recipient'

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Payment Cancelled</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${displayUserName},<br><br>
      Your gift card payment of N${data.amount.toLocaleString()} for ${displayRecipientName} was cancelled or did not complete.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #fef2f2; border-radius: 12px; border: 1px solid #fecaca;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #991b1b;">Payment Not Completed</h3>
          <p style="margin: 0; font-size: 14px; color: #7f1d1d;">
            Your gift card order has not been processed. No charges were made to your account.
          </p>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      If you experienced any issues during payment, please try again or contact us for assistance.
    </p>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 8px;">
          <a href="https://dermaspaceng.com/gift-cards" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            Try Again
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      Need help? Contact us at hello@dermaspaceng.com or call +234 901 797 2919.
    </p>
  `
  
  return sendEmail({
    to: data.userEmail,
    subject: 'Payment Cancelled - Gift Card Order - Dermaspace',
    html: getEmailTemplate(content)
  })
}

// Send newsletter welcome email
export async function sendNewsletterWelcome(email: string): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Welcome to Dermaspace!</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Thank you for subscribing to our newsletter! You're now part of the Dermaspace family.
    </p>
    
    <div style="background-color: #f8f5fa; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #7B2D8E;">What to expect:</h3>
      <ul style="margin: 0; padding: 0 0 0 20px; color: #4a4a4a; font-size: 14px; line-height: 1.8;">
        <li>Weekly skincare tips and advice</li>
        <li>Exclusive offers and discounts</li>
        <li>Early access to new treatments</li>
        <li>Beauty and wellness inspiration</li>
      </ul>
    </div>
    
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Ready to book your first treatment? Visit our spa in Victoria Island or Ikoyi.
    </p>
    
    <a href="https://dermaspaceng.com/booking" style="display: inline-block; padding: 14px 28px; background-color: #7B2D8E; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
      Book an Appointment
    </a>
  `
  
  return sendEmail({
    to: email,
    subject: 'Welcome to Dermaspace Newsletter!',
    html: getEmailTemplate(content)
  })
}

// ============= ADMIN & STAFF NOTIFICATIONS =============

// Staff invitation email
export async function sendStaffInvitation(data: {
  email: string
  inviterName: string
  role: 'staff' | 'admin'
  token: string
}): Promise<boolean> {
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?token=${data.token}`
  
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">You're Invited to Join Dermaspace</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      ${data.inviterName} has invited you to join Dermaspace as a <strong>${data.role}</strong>. 
      Click the button below to create your account and get started.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f8f5fa; border-radius: 12px;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #7B2D8E;">Your Role</h3>
          <p style="margin: 0; font-size: 14px; color: #4a4a4a; text-transform: capitalize;">
            ${data.role} - You'll have access to the ${data.role} dashboard to manage customer requests.
          </p>
        </td>
      </tr>
    </table>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 8px;">
          <a href="${acceptUrl}" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            Accept Invitation
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: `You're Invited to Join Dermaspace as ${data.role}`,
    html: getEmailTemplate(content)
  })
}

// Reply notification to user
export async function sendReplyNotification(data: {
  email: string
  firstName: string
  requestType: 'gift_card' | 'complaint' | 'consultation'
  requestTitle: string
  replyMessage: string
  responderName: string
  newStatus?: string
}): Promise<boolean> {
  const typeLabels = {
    gift_card: 'Gift Card Request',
    complaint: 'Support Request',
    consultation: 'Consultation Request'
  }
  
  const statusBadge = data.newStatus ? `
    <span style="display: inline-block; padding: 4px 12px; background-color: ${
      data.newStatus === 'approved' || data.newStatus === 'confirmed' ? '#dcfce7' :
      data.newStatus === 'rejected' || data.newStatus === 'cancelled' ? '#fef2f2' : '#fef3c7'
    }; color: ${
      data.newStatus === 'approved' || data.newStatus === 'confirmed' ? '#166534' :
      data.newStatus === 'rejected' || data.newStatus === 'cancelled' ? '#991b1b' : '#92400e'
    }; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: capitalize;">
      ${data.newStatus.replace(/_/g, ' ')}
    </span>
  ` : ''
  
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">You've Got a Response!</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      ${data.responderName} from Dermaspace has responded to your ${typeLabels[data.requestType]}.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f8f5fa; border-radius: 12px; border-left: 4px solid #7B2D8E;">
      <tr>
        <td style="padding: 20px;">
          <div style="margin-bottom: 12px;">
            <span style="font-size: 12px; color: #7B2D8E; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
              ${typeLabels[data.requestType]}
            </span>
            ${statusBadge}
          </div>
          <p style="margin: 0 0 12px; font-size: 14px; color: #666;">
            <strong>Regarding:</strong> ${data.requestTitle}
          </p>
          <div style="padding: 16px; background-color: white; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #1a1a1a; white-space: pre-wrap; line-height: 1.6;">
              ${data.replyMessage}
            </p>
          </div>
          <p style="margin: 12px 0 0; font-size: 12px; color: #888;">
            - ${data.responderName}, Dermaspace Team
          </p>
        </td>
      </tr>
    </table>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 8px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            View in Dashboard
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      You can view all your requests and responses in your dashboard at any time.
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: `Response to Your ${typeLabels[data.requestType]} - Dermaspace`,
    html: getEmailTemplate(content)
  })
}

// Status update notification
export async function sendStatusUpdateNotification(data: {
  email: string
  firstName: string
  requestType: 'gift_card' | 'complaint' | 'consultation'
  requestTitle: string
  oldStatus: string
  newStatus: string
}): Promise<boolean> {
  const typeLabels = {
    gift_card: 'Gift Card Request',
    complaint: 'Support Request',
    consultation: 'Consultation Request'
  }
  
  const statusColors: Record<string, { bg: string; text: string }> = {
    pending: { bg: '#fef3c7', text: '#92400e' },
    approved: { bg: '#dcfce7', text: '#166534' },
    confirmed: { bg: '#dcfce7', text: '#166534' },
    completed: { bg: '#dbeafe', text: '#1e40af' },
    resolved: { bg: '#dbeafe', text: '#1e40af' },
    rejected: { bg: '#fef2f2', text: '#991b1b' },
    cancelled: { bg: '#fef2f2', text: '#991b1b' },
    in_progress: { bg: '#f3e8ff', text: '#6b21a8' },
    processing: { bg: '#f3e8ff', text: '#6b21a8' },
  }
  
  const newStatusColor = statusColors[data.newStatus] || statusColors.pending
  
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Status Update</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      The status of your ${typeLabels[data.requestType]} has been updated.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f9fafb; border-radius: 12px;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 12px; font-size: 14px; color: #666;">
            <strong>${data.requestTitle}</strong>
          </p>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; padding: 4px 12px; background-color: #f3f4f6; color: #6b7280; border-radius: 20px; font-size: 12px; text-transform: capitalize; text-decoration: line-through;">
              ${data.oldStatus.replace(/_/g, ' ')}
            </span>
            <span style="font-size: 16px; color: #9ca3af;">→</span>
            <span style="display: inline-block; padding: 6px 14px; background-color: ${newStatusColor.bg}; color: ${newStatusColor.text}; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: capitalize;">
              ${data.newStatus.replace(/_/g, ' ')}
            </span>
          </div>
        </td>
      </tr>
    </table>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 8px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            View Details
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      If you have any questions, please don't hesitate to contact us.
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: `${typeLabels[data.requestType]} Status Updated - Dermaspace`,
    html: getEmailTemplate(content)
  })
}

// Admin notification for new requests
export async function sendAdminNewRequestNotification(data: {
  adminEmail: string
  requestType: 'gift_card' | 'complaint' | 'consultation' | 'survey'
  customerName: string
  customerEmail: string
  details: string
}): Promise<boolean> {
  const typeLabels = {
    gift_card: 'Gift Card Request',
    complaint: 'New Complaint',
    consultation: 'Consultation Request',
    survey: 'Survey Response'
  }
  
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">New ${typeLabels[data.requestType]}</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      A new ${typeLabels[data.requestType].toLowerCase()} has been submitted and requires your attention.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f8f5fa; border-radius: 12px;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #7B2D8E; text-transform: uppercase; letter-spacing: 1px;">Customer Details</h3>
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 4px 0; font-size: 14px; color: #666; width: 80px;">Name:</td>
              <td style="padding: 4px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.customerName}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-size: 14px; color: #666;">Email:</td>
              <td style="padding: 4px 0; font-size: 14px; color: #1a1a1a;">${data.customerEmail}</td>
            </tr>
          </table>
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 14px; color: #4a4a4a;">${data.details}</p>
          </div>
        </td>
      </tr>
    </table>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 8px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/${data.requestType === 'gift_card' ? 'gift-cards' : data.requestType === 'complaint' ? 'complaints' : data.requestType + 's'}" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            View in Admin Dashboard
          </a>
        </td>
      </tr>
    </table>
  `
  
  return sendEmail({
    to: data.adminEmail,
    subject: `New ${typeLabels[data.requestType]} - Action Required`,
    html: getEmailTemplate(content)
  })
}

// Password reset email
export async function sendPasswordResetEmail(email: string, firstName: string, token: string): Promise<boolean> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`
  
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Reset Your Password</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${firstName},<br><br>
      We received a request to reset your password for your Dermaspace account. Click the button below to create a new password.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 8px;">
          <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            Reset Password
          </a>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 16px; font-size: 13px; color: #888;">
      This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>
    <p style="margin: 0; font-size: 12px; color: #aaa;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <span style="color: #7B2D8E; word-break: break-all;">${resetUrl}</span>
    </p>
  `
  
  return sendEmail({
    to: email,
    subject: 'Reset Your Password - Dermaspace',
    html: getEmailTemplate(content)
  })
}

// Security reminder email - tips to secure account
export async function sendSecurityReminderEmail(data: {
  email: string
  firstName: string
  hasPasskey: boolean
  has2FA: boolean
}): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dermaspaceng.com'
  const passkeyUrl = `${appUrl}/dashboard/settings?section=security&action=passkey`
  const twoFAUrl = `${appUrl}/dashboard/settings?section=security&action=2fa`
  const settingsUrl = `${appUrl}/dashboard/settings?section=security`
  
  // Build tips based on what's missing
  const tips: string[] = []
  
  if (!data.hasPasskey) {
    tips.push(`
      <tr>
        <td style="padding: 16px; background-color: #f8f5fa; border-radius: 12px; margin-bottom: 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="width: 48px; vertical-align: top;">
                <div style="width: 40px; height: 40px; background-color: #7B2D8E; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 20px;">&#128274;</span>
                </div>
              </td>
              <td style="padding-left: 12px;">
                <h4 style="margin: 0 0 4px; font-size: 15px; font-weight: 600; color: #1a1a1a;">Add a Passkey</h4>
                <p style="margin: 0 0 12px; font-size: 13px; color: #666; line-height: 1.5;">
                  Passkeys are the most secure way to sign in. They use your device's biometrics (fingerprint or face) - no password needed!
                </p>
                <a href="${passkeyUrl}" style="display: inline-block; padding: 8px 16px; background-color: #7B2D8E; color: #ffffff; font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                  Set Up Passkey
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height: 12px;"></td></tr>
    `)
  }
  
  if (!data.has2FA) {
    tips.push(`
      <tr>
        <td style="padding: 16px; background-color: #f0f9ff; border-radius: 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="width: 48px; vertical-align: top;">
                <div style="width: 40px; height: 40px; background-color: #0369a1; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 20px;">&#128241;</span>
                </div>
              </td>
              <td style="padding-left: 12px;">
                <h4 style="margin: 0 0 4px; font-size: 15px; font-weight: 600; color: #1a1a1a;">Enable Two-Factor Authentication</h4>
                <p style="margin: 0 0 12px; font-size: 13px; color: #666; line-height: 1.5;">
                  Add an extra layer of security with 2FA. Even if someone knows your password, they won't be able to access your account.
                </p>
                <a href="${twoFAUrl}" style="display: inline-block; padding: 8px 16px; background-color: #0369a1; color: #ffffff; font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                  Enable 2FA
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height: 12px;"></td></tr>
    `)
  }
  
  // Always include general security tips
  tips.push(`
    <tr>
      <td style="padding: 16px; background-color: #f0fdf4; border-radius: 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="width: 48px; vertical-align: top;">
              <div style="width: 40px; height: 40px; background-color: #166534; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 20px;">&#9989;</span>
              </div>
            </td>
            <td style="padding-left: 12px;">
              <h4 style="margin: 0 0 4px; font-size: 15px; font-weight: 600; color: #1a1a1a;">General Security Tips</h4>
              <ul style="margin: 0; padding-left: 16px; font-size: 13px; color: #666; line-height: 1.6;">
                <li>Use a unique, strong password for your Dermaspace account</li>
                <li>Never share your login credentials with anyone</li>
                <li>Check your account activity regularly for suspicious logins</li>
                <li>Keep your email address up to date for security alerts</li>
              </ul>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `)
  
  const content = `
    <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Secure Your Dermaspace Account</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      Your account security is important to us. Here are some tips to help keep your Dermaspace account safe and protected.
    </p>
    
    <!-- Security Status -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #fafafa; border-radius: 12px; border: 1px solid #e5e7eb;">
      <tr>
        <td style="padding: 16px;">
          <h3 style="margin: 0 0 12px; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Your Security Status</h3>
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 6px 12px 6px 0;">
                <span style="display: inline-block; width: 20px; height: 20px; line-height: 20px; text-align: center; border-radius: 50%; background-color: ${data.hasPasskey ? '#dcfce7' : '#fef2f2'}; font-size: 12px;">
                  ${data.hasPasskey ? '&#10003;' : '&#10007;'}
                </span>
              </td>
              <td style="padding: 6px 0; font-size: 14px; color: ${data.hasPasskey ? '#166534' : '#dc2626'};">
                Passkey ${data.hasPasskey ? 'Enabled' : 'Not Set Up'}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 12px 6px 0;">
                <span style="display: inline-block; width: 20px; height: 20px; line-height: 20px; text-align: center; border-radius: 50%; background-color: ${data.has2FA ? '#dcfce7' : '#fef2f2'}; font-size: 12px;">
                  ${data.has2FA ? '&#10003;' : '&#10007;'}
                </span>
              </td>
              <td style="padding: 6px 0; font-size: 14px; color: ${data.has2FA ? '#166534' : '#dc2626'};">
                Two-Factor Auth ${data.has2FA ? 'Enabled' : 'Not Enabled'}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Security Tips -->
    <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #1a1a1a;">Recommended Actions</h3>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      ${tips.join('')}
    </table>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 8px;">
          <a href="${settingsUrl}" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            Go to Security Settings
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      If you have any questions about account security, please don't hesitate to contact our support team.
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: 'Secure Your Account - Dermaspace Security Tips',
    html: getEmailTemplate(content)
  })
}
