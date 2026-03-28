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
            <td style="padding: 32px 40px; text-align: center; background: linear-gradient(135deg, #7B2D8E 0%, #9B4DB0 100%); border-bottom: 1px solid #f0f0f0;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="text-align: center;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Dermaspace</h1>
                    <p style="margin: 6px 0 0; font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.85); letter-spacing: 2px; text-transform: uppercase;">Esthetic & Wellness Centre</p>
                  </td>
                </tr>
              </table>
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

// Gift card request to admin
export async function sendGiftCardRequestToAdmin(data: {
  amount: number
  design: string
  occasion: string
  font: string
  recipientName: string
  recipientEmail: string
  recipientPhone: string
  senderName: string
  senderEmail: string
  personalMessage: string
  deliveryMethod: string
  deliveryDate: string
}): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">New Gift Card Request</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      A new gift card request has been submitted. Please review the details below and process the order.
    </p>
    
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
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Design:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${data.design}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Occasion:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${data.occasion}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Font Style:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${data.font}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Delivery Method:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${data.deliveryMethod}</td>
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
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.recipientName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Email:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${data.recipientEmail}</td>
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
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.senderName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Email:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${data.senderEmail}</td>
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
      Please process this request and send payment instructions to the sender.
    </p>
  `
  
  return sendEmail({
    to: 'admin@dermaspaceng.com',
    subject: `New Gift Card Request - N${data.amount.toLocaleString()} - ${data.senderName}`,
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
}): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Gift Card Request Received!</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.userName},<br><br>
      Thank you for your gift card request! We've received your order and our team will process it shortly.
    </p>
    
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
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500;">${data.recipientName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Occasion:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${data.occasion}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #1a1a1a;">What's Next?</h3>
    <ol style="margin: 0 0 24px; padding-left: 20px; font-size: 14px; color: #4a4a4a; line-height: 1.8;">
      <li>Our team will review your gift card design</li>
      <li>You'll receive payment instructions via email</li>
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
