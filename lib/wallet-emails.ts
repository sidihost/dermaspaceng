import nodemailer from 'nodemailer'

const SMTP_PASSWORD = process.env.ZEPTO_MAIL_PASSWORD
const FROM_EMAIL = 'hello@dermaspaceng.com'
const FROM_NAME = 'Dermaspace'
// Brand color
const BRAND_COLOR = '#7B2D8E'

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

// Clean, full-width email template like Facebook
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
            <td style="padding: 32px 24px 24px; border-bottom: 1px solid #e5e5e5;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <!-- Dermaspace Logo -->
                    <img src="${process.env.NEXT_PUBLIC_APP_URL}/images/dermaspace-email-logo.png" alt="Dermaspace Esthetic And Wellness Centre" width="220" height="auto" style="display: block; max-width: 220px; height: auto;" />
                  </td>
                </tr>
              </table>
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Wallet funding confirmation
export async function sendWalletFundingConfirmation(data: {
  email: string
  firstName: string
  amount: number
  newBalance: number
  reference: string
}): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Wallet Funded Successfully</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      Your Dermaspace wallet has been funded successfully. You can now use your wallet balance to book services and purchase gift cards.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #166534; text-transform: uppercase; letter-spacing: 1px;">Transaction Details</h3>
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666; width: 140px;">Amount Funded:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #166534; font-weight: 600;">${formatCurrency(data.amount)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">New Balance:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #7B2D8E; font-weight: 600;">${formatCurrency(data.newBalance)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Reference:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${data.reference}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 8px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            View Wallet
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      Thank you for choosing Dermaspace!
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: 'Wallet Funded Successfully - Dermaspace',
    html: getEmailTemplate(content)
  })
}

// Payment confirmation
export async function sendPaymentConfirmation(data: {
  email: string
  firstName: string
  amount: number
  description: string
  newBalance: number
  reference: string
}): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Payment Successful</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      Your payment has been processed successfully from your Dermaspace wallet.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f8f5fa; border-radius: 12px;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #7B2D8E; text-transform: uppercase; letter-spacing: 1px;">Payment Details</h3>
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666; width: 140px;">Description:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${data.description}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Amount:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #7B2D8E; font-weight: 600;">${formatCurrency(data.amount)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Remaining Balance:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${formatCurrency(data.newBalance)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Reference:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${data.reference}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      Thank you for choosing Dermaspace!
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: 'Payment Successful - Dermaspace',
    html: getEmailTemplate(content)
  })
}

// Invoice email
export async function sendInvoiceEmail(data: {
  email: string
  firstName: string
  invoiceNumber: string
  amount: number
  items: { description: string; amount: number; quantity: number }[]
  paymentMethod: string
  paymentReference: string
}): Promise<boolean> {
  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 12px 0; font-size: 14px; color: #1a1a1a; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
      <td style="padding: 12px 0; font-size: 14px; color: #1a1a1a; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px 0; font-size: 14px; color: #1a1a1a; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.amount)}</td>
    </tr>
  `).join('')
  
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Invoice #${data.invoiceNumber}</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      Thank you for your purchase. Please find your invoice details below.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr style="background-color: #f9fafb;">
              <td style="padding: 12px 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Item</td>
              <td style="padding: 12px 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; text-align: center;">Qty</td>
              <td style="padding: 12px 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; text-align: right;">Amount</td>
            </tr>
            ${itemsHtml}
            <tr>
              <td colspan="2" style="padding: 16px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">Total</td>
              <td style="padding: 16px 0; font-size: 18px; font-weight: 700; color: #7B2D8E; text-align: right;">${formatCurrency(data.amount)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #f9fafb; border-radius: 12px;">
      <tr>
        <td style="padding: 16px 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-size: 13px; color: #666; width: 140px;">Payment Method:</td>
              <td style="font-size: 13px; color: #1a1a1a;">${data.paymentMethod}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #666; padding-top: 8px;">Reference:</td>
              <td style="font-size: 13px; color: #1a1a1a; padding-top: 8px;">${data.paymentReference}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #666; padding-top: 8px;">Date:</td>
              <td style="font-size: 13px; color: #1a1a1a; padding-top: 8px;">${new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      This is an automated invoice. If you have any questions, please contact us.
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: `Invoice #${data.invoiceNumber} - Dermaspace`,
    html: getEmailTemplate(content)
  })
}

// Payment failed email
export async function sendPaymentFailedEmail(data: {
  email: string
  firstName: string
  amount: number
  reason: string
  reference: string
}): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Payment Failed</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      Unfortunately, your recent payment attempt was unsuccessful.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #fef2f2; border-radius: 12px; border: 1px solid #fecaca;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #dc2626;">Payment Details</h3>
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666; width: 140px;">Amount:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${formatCurrency(data.amount)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Reason:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #dc2626;">${data.reason}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Reference:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${data.reference}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 8px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            Try Again
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      If you continue to experience issues, please contact our support team.
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: 'Payment Failed - Dermaspace',
    html: getEmailTemplate(content)
  })
}

// Abandoned payment reminder
export async function sendAbandonedPaymentReminder(data: {
  email: string
  firstName: string
  paymentType: string
  amount: number
  itemDetails: Record<string, unknown>
  recoveryUrl: string
}): Promise<boolean> {
  const itemDescription = data.paymentType === 'wallet_funding' 
    ? 'wallet funding'
    : data.paymentType === 'gift_card'
    ? 'gift card purchase'
    : data.paymentType === 'booking'
    ? 'service booking'
    : 'purchase'
    
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Continue Your ${itemDescription.charAt(0).toUpperCase() + itemDescription.slice(1)}</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      We noticed you didn't complete your recent ${itemDescription}. Your cart is still waiting for you!
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #fef3c7; border-radius: 12px; border: 1px solid #fcd34d;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #92400e;">Your Pending ${itemDescription.charAt(0).toUpperCase() + itemDescription.slice(1)}</h3>
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666; width: 100px;">Amount:</td>
              <td style="padding: 8px 0; font-size: 18px; color: #7B2D8E; font-weight: 700;">${formatCurrency(data.amount)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 8px;">
          <a href="${data.recoveryUrl}" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            Continue Where You Left Off
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      This link will expire in 7 days. If you have any questions, feel free to reach out to us.
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: `Complete Your ${itemDescription.charAt(0).toUpperCase() + itemDescription.slice(1)} - Dermaspace`,
    html: getEmailTemplate(content)
  })
}

// Budget alert email
export async function sendBudgetAlert(data: {
  email: string
  firstName: string
  budget: number
  spent: number
  percentage: number
}): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Budget Alert</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      You've reached ${data.percentage}% of your monthly budget on Dermaspace.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #fff8e6; border-radius: 12px; border: 1px solid #f0d78c;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #856404;">Budget Status</h3>
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666; width: 140px;">Monthly Budget:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${formatCurrency(data.budget)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Amount Spent:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #dc2626; font-weight: 600;">${formatCurrency(data.spent)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: #666;">Remaining:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #166534;">${formatCurrency(data.budget - data.spent)}</td>
            </tr>
          </table>
          
          <!-- Progress bar -->
          <div style="margin-top: 16px; background-color: #e5e7eb; border-radius: 8px; height: 8px; overflow: hidden;">
            <div style="background-color: ${data.percentage >= 90 ? '#dc2626' : data.percentage >= 75 ? '#f59e0b' : '#7B2D8E'}; height: 100%; width: ${Math.min(data.percentage, 100)}%;"></div>
          </div>
          <p style="margin: 8px 0 0; font-size: 12px; color: #666; text-align: center;">${data.percentage}% of budget used</p>
        </td>
      </tr>
    </table>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 8px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            Manage Budget Settings
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      You can adjust your budget settings anytime from your wallet dashboard.
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: 'Budget Alert - Dermaspace',
    html: getEmailTemplate(content)
  })
}

// Low balance alert
export async function sendLowBalanceAlert(data: {
  email: string
  firstName: string
  currentBalance: number
  threshold: number
}): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">Low Wallet Balance</h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
      Hi ${data.firstName},<br><br>
      Your Dermaspace wallet balance is running low. Consider topping up to continue enjoying our services.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; background-color: #fef2f2; border-radius: 12px; border: 1px solid #fecaca;">
      <tr>
        <td style="padding: 20px; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #666;">Current Balance</p>
          <p style="margin: 0; font-size: 32px; font-weight: 700; color: #dc2626;">${formatCurrency(data.currentBalance)}</p>
        </td>
      </tr>
    </table>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color: #7B2D8E; border-radius: 8px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            Top Up Wallet
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #888;">
      Your alert threshold is set to ${formatCurrency(data.threshold)}. You can change this in your wallet settings.
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: 'Low Wallet Balance - Dermaspace',
    html: getEmailTemplate(content)
  })
}

// Wallet setup complete welcome email - Clean design like Facebook
export async function sendWalletWelcomeEmail(data: {
  email: string
  firstName: string
}): Promise<boolean> {
  const content = `
    <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 400; color: #1c1e21; line-height: 1.2;">Your Wallet is Ready!</h1>
    
    <p style="margin: 0 0 24px; font-size: 16px; color: #1c1e21; line-height: 1.5;">
      Hi ${data.firstName},
    </p>
    
    <p style="margin: 0 0 24px; font-size: 16px; color: #1c1e21; line-height: 1.5;">
      Great news! Your Dermaspace wallet has been successfully set up. You can now enjoy faster checkouts, exclusive offers, and seamless payments.
    </p>
    
    <!-- Simple info box with brand color border -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td style="padding: 20px; border: 2px solid ${BRAND_COLOR}; border-radius: 6px;">
          <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #1c1e21;">Get Started:</p>
          <p style="margin: 0 0 8px; font-size: 14px; color: #65676b;">1. Fund your wallet to start</p>
          <p style="margin: 0 0 8px; font-size: 14px; color: #65676b;">2. Set a monthly budget (optional)</p>
          <p style="margin: 0; font-size: 14px; color: #65676b;">3. Book services with one tap</p>
        </td>
      </tr>
    </table>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      <tr>
        <td>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet" style="display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; background-color: ${BRAND_COLOR}; border-radius: 6px;">
            Fund Your Wallet
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 14px; color: #1c1e21; line-height: 1.5;">
      Thanks,<br>
      Dermaspace Team
    </p>
  `
  
  return sendEmail({
    to: data.email,
    subject: 'Your Dermaspace Wallet is Ready!',
    html: getEmailTemplate(content)
  })
}
