import { streamText, tool, stepCountIs } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { sql } from '@/lib/db'
import { sendPasswordResetEmail, sendVerificationEmail } from '@/lib/email'

export const maxDuration = 30

// Define all the tools the AI can use
const tools = {
  // Get user's wallet balance
  getWalletBalance: tool({
    description: 'Get the current wallet balance for the logged-in user. Use this when user asks about their balance, wallet, or money.',
    inputSchema: z.object({}),
    execute: async () => {
      const cookieStore = await cookies()
      const sessionId = cookieStore.get('session_id')?.value
      
      if (!sessionId) {
        return { success: false, message: 'User not logged in. Please sign in first.' }
      }
      
      try {
        const sessions = await sql`
          SELECT user_id FROM sessions WHERE id = ${sessionId} AND expires_at > NOW()
        `
        if (sessions.length === 0) {
          return { success: false, message: 'Session expired. Please sign in again.' }
        }
        
        const userId = sessions[0].user_id
        const wallets = await sql`
          SELECT balance, currency FROM wallets WHERE user_id = ${userId}
        `
        
        if (wallets.length === 0) {
          return { success: true, balance: 0, currency: 'NGN', formatted: '₦0.00' }
        }
        
        const wallet = wallets[0]
        return {
          success: true,
          balance: Number(wallet.balance),
          currency: wallet.currency,
          formatted: `₦${Number(wallet.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
        }
      } catch (error) {
        console.error('Wallet error:', error)
        return { success: false, message: 'Could not fetch wallet balance.' }
      }
    }
  }),

  // Get user's upcoming bookings
  getBookings: tool({
    description: 'Get the user\'s upcoming appointments/bookings. Use when user asks about their appointments, bookings, or scheduled visits.',
    inputSchema: z.object({}),
    execute: async () => {
      const cookieStore = await cookies()
      const sessionId = cookieStore.get('session_id')?.value
      
      if (!sessionId) {
        return { success: false, message: 'Please sign in to view your bookings.' }
      }
      
      try {
        const sessions = await sql`
          SELECT user_id FROM sessions WHERE id = ${sessionId} AND expires_at > NOW()
        `
        if (sessions.length === 0) {
          return { success: false, message: 'Session expired. Please sign in again.' }
        }
        
        const userId = sessions[0].user_id
        const bookings = await sql`
          SELECT service_name, location, appointment_date, appointment_time, status
          FROM bookings 
          WHERE user_id = ${userId} AND appointment_date >= CURRENT_DATE
          ORDER BY appointment_date ASC, appointment_time ASC
          LIMIT 5
        `
        
        if (bookings.length === 0) {
          return { success: true, bookings: [], message: 'No upcoming appointments found.' }
        }
        
        return {
          success: true,
          bookings: bookings.map(b => ({
            service: b.service_name,
            location: b.location,
            date: b.appointment_date,
            time: b.appointment_time,
            status: b.status
          }))
        }
      } catch {
        return { success: true, bookings: [], message: 'No upcoming appointments found.' }
      }
    }
  }),

  // Get transaction history
  getTransactionHistory: tool({
    description: 'Get the user\'s recent wallet transactions. Use when user asks about their payment history, transactions, or spending.',
    inputSchema: z.object({
      limit: z.number().min(1).max(20).default(5).describe('Number of transactions to fetch')
    }),
    execute: async ({ limit }) => {
      const cookieStore = await cookies()
      const sessionId = cookieStore.get('session_id')?.value
      
      if (!sessionId) {
        return { success: false, message: 'Please sign in to view transactions.' }
      }
      
      try {
        const sessions = await sql`
          SELECT user_id FROM sessions WHERE id = ${sessionId} AND expires_at > NOW()
        `
        if (sessions.length === 0) {
          return { success: false, message: 'Session expired.' }
        }
        
        const userId = sessions[0].user_id
        const transactions = await sql`
          SELECT type, amount, description, status, created_at
          FROM wallet_transactions 
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
        
        return {
          success: true,
          transactions: transactions.map(t => ({
            type: t.type,
            amount: `₦${Number(t.amount).toLocaleString()}`,
            description: t.description,
            status: t.status,
            date: new Date(t.created_at).toLocaleDateString('en-NG')
          }))
        }
      } catch {
        return { success: true, transactions: [], message: 'No transactions found.' }
      }
    }
  }),

  // Get services info
  getServices: tool({
    description: 'Get information about Dermaspace services. Use when user asks about treatments, services, facials, massages, prices, or what we offer.',
    inputSchema: z.object({
      category: z.enum(['facial', 'body', 'nail', 'waxing', 'all']).describe('Service category to get info about')
    }),
    execute: async ({ category }) => {
      const services = {
        facial: {
          name: 'Facial Treatments',
          services: [
            { name: 'Deep Cleansing Facial', price: '₦15,000 - ₦25,000', duration: '60-90 mins' },
            { name: 'Hydrating Facial', price: '₦18,000 - ₦30,000', duration: '60 mins' },
            { name: 'Anti-Aging Facial', price: '₦25,000 - ₦45,000', duration: '75 mins' },
            { name: 'Acne Treatment', price: '₦20,000 - ₦35,000', duration: '60 mins' },
            { name: 'LED Light Therapy', price: '₦15,000 - ₦25,000', duration: '30-45 mins' },
            { name: 'Microdermabrasion', price: '₦30,000 - ₦50,000', duration: '45-60 mins' }
          ],
          link: '/services/facial-treatments'
        },
        body: {
          name: 'Body Treatments',
          services: [
            { name: 'Swedish Massage', price: '₦20,000 - ₦35,000', duration: '60 mins' },
            { name: 'Deep Tissue Massage', price: '₦25,000 - ₦40,000', duration: '60-90 mins' },
            { name: 'Hot Stone Massage', price: '₦30,000 - ₦45,000', duration: '75 mins' },
            { name: 'Aromatherapy', price: '₦25,000 - ₦40,000', duration: '60 mins' },
            { name: 'Body Scrub', price: '₦18,000 - ₦30,000', duration: '45 mins' },
            { name: 'Detox Body Wrap', price: '₦35,000 - ₦55,000', duration: '90 mins' }
          ],
          link: '/services/body-treatments'
        },
        nail: {
          name: 'Nail Care',
          services: [
            { name: 'Classic Manicure', price: '₦5,000 - ₦8,000', duration: '30 mins' },
            { name: 'Gel Manicure', price: '₦10,000 - ₦15,000', duration: '45 mins' },
            { name: 'Classic Pedicure', price: '₦7,000 - ₦12,000', duration: '45 mins' },
            { name: 'Gel Pedicure', price: '₦12,000 - ₦18,000', duration: '60 mins' },
            { name: 'Nail Art', price: '₦3,000+', duration: 'varies' }
          ],
          link: '/services/nail-care'
        },
        waxing: {
          name: 'Waxing Services',
          services: [
            { name: 'Face Waxing', price: '₦3,000 - ₦8,000', duration: '15-30 mins' },
            { name: 'Arms Waxing', price: '₦8,000 - ₦12,000', duration: '30 mins' },
            { name: 'Legs Waxing', price: '₦12,000 - ₦20,000', duration: '45-60 mins' },
            { name: 'Bikini Waxing', price: '₦10,000 - ₦18,000', duration: '30 mins' },
            { name: 'Full Body Wax', price: '₦35,000 - ₦55,000', duration: '90+ mins' }
          ],
          link: '/services/waxing'
        }
      }
      
      if (category === 'all') {
        return { success: true, services: Object.values(services), overviewLink: '/services' }
      }
      
      return { success: true, ...services[category] }
    }
  }),

  // Get location info
  getLocations: tool({
    description: 'Get Dermaspace location information, addresses, hours, and contact details. Use when user asks where we are, our address, hours, or how to reach us.',
    inputSchema: z.object({}),
    execute: async () => {
      return {
        success: true,
        locations: [
          {
            name: 'Victoria Island',
            address: 'Plot 5, Block A, Adeola Odeku Street, Victoria Island, Lagos',
            phone: '+234 901 797 2919',
            hours: 'Mon-Sat: 9AM - 7PM, Sunday: By Appointment'
          },
          {
            name: 'Ikoyi',
            address: '12 Bourdillon Road, Ikoyi, Lagos',
            phone: '+234 816 776 4757',
            hours: 'Mon-Sat: 9AM - 7PM, Sunday: By Appointment'
          }
        ],
        email: 'hello@dermaspaceng.com',
        contactLink: '/contact'
      }
    }
  }),

  // Create booking (conversational)
  createBooking: tool({
    description: 'Help user book an appointment. Use when user wants to book, schedule, or make an appointment.',
    inputSchema: z.object({
      service: z.string().describe('The service user wants to book'),
      location: z.enum(['Victoria Island', 'Ikoyi']).describe('Preferred location'),
      preferredDate: z.string().describe('Preferred date for the appointment'),
      preferredTime: z.string().describe('Preferred time for the appointment')
    }),
    execute: async ({ service, location, preferredDate, preferredTime }) => {
      const cookieStore = await cookies()
      const sessionId = cookieStore.get('session_id')?.value
      
      if (!sessionId) {
        return { 
          success: false, 
          message: 'Please sign in to book an appointment. You can also book directly at /booking',
          action: 'login_required',
          bookingLink: '/booking'
        }
      }
      
      // For now, return confirmation info - in production this would create the booking
      return {
        success: true,
        message: `I've prepared your booking for ${service} at ${location} on ${preferredDate} at ${preferredTime}. Please confirm to finalize.`,
        booking: {
          service,
          location,
          date: preferredDate,
          time: preferredTime
        },
        confirmationRequired: true,
        bookingLink: '/booking'
      }
    }
  }),

  // Get user profile
  getUserProfile: tool({
    description: 'Get the current user\'s profile information. Use when user asks about their account, profile, or personal details.',
    inputSchema: z.object({}),
    execute: async () => {
      const cookieStore = await cookies()
      const sessionId = cookieStore.get('session_id')?.value
      
      if (!sessionId) {
        return { success: false, message: 'Please sign in to view your profile.' }
      }
      
      try {
        const sessions = await sql`
          SELECT u.first_name, u.last_name, u.email, u.phone, u.username
          FROM sessions s
          JOIN users u ON s.user_id = u.id
          WHERE s.id = ${sessionId} AND s.expires_at > NOW()
        `
        
        if (sessions.length === 0) {
          return { success: false, message: 'Session expired. Please sign in again.' }
        }
        
        const user = sessions[0]
        return {
          success: true,
          profile: {
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            phone: user.phone,
            username: user.username
          },
          profileLink: '/dashboard/settings'
        }
      } catch {
        return { success: false, message: 'Could not fetch profile.' }
      }
    }
  }),

  // Get packages/memberships
  getPackages: tool({
    description: 'Get information about spa packages and membership options. Use when user asks about packages, memberships, deals, or special offers.',
    inputSchema: z.object({}),
    execute: async () => {
      return {
        success: true,
        packages: [
          {
            name: 'Platinum Membership',
            benefits: ['20% off all services', 'Priority booking', 'Exclusive member events', 'Birthday special'],
            price: '₦50,000/month'
          },
          {
            name: 'Couples Package',
            description: 'Perfect for date nights or special occasions',
            includes: ['2 Swedish Massages', '2 Facials', 'Complimentary refreshments'],
            price: '₦85,000'
          },
          {
            name: 'Bridal Package',
            description: 'Pre-wedding pampering',
            includes: ['Full body massage', 'Bridal facial', 'Manicure & Pedicure', 'Hair treatment'],
            price: '₦150,000'
          }
        ],
        packagesLink: '/packages',
        membershipLink: '/membership'
      }
    }
  }),

  // Navigate to page
  navigateToPage: tool({
    description: 'Direct user to a specific page on the website. Use when user wants to go somewhere or needs a link.',
    inputSchema: z.object({
      page: z.enum([
        'home', 'services', 'booking', 'contact', 'about', 'packages',
        'facial', 'body', 'nail', 'waxing', 'membership', 'gift-cards',
        'dashboard', 'wallet', 'settings', 'gallery', 'consultation'
      ]).describe('Page to navigate to')
    }),
    execute: async ({ page }) => {
      const pageLinks: Record<string, { path: string; description: string }> = {
        home: { path: '/', description: 'Homepage' },
        services: { path: '/services', description: 'All our services' },
        booking: { path: '/booking', description: 'Book an appointment' },
        contact: { path: '/contact', description: 'Contact us' },
        about: { path: '/about', description: 'About Dermaspace' },
        packages: { path: '/packages', description: 'Spa packages' },
        facial: { path: '/services/facial-treatments', description: 'Facial treatments' },
        body: { path: '/services/body-treatments', description: 'Body treatments' },
        nail: { path: '/services/nail-care', description: 'Nail care' },
        waxing: { path: '/services/waxing', description: 'Waxing services' },
        membership: { path: '/membership', description: 'Membership options' },
        'gift-cards': { path: '/gift-cards', description: 'Gift cards' },
        dashboard: { path: '/dashboard', description: 'Your dashboard' },
        wallet: { path: '/dashboard', description: 'Your wallet' },
        settings: { path: '/dashboard/settings', description: 'Account settings' },
        gallery: { path: '/gallery', description: 'Photo gallery' },
        consultation: { path: '/consultation', description: 'Free skin consultation' }
      }
      
      const { path, description } = pageLinks[page]
      return { success: true, path, description, navigate: true }
    }
  }),

  // Get consultation info
  getConsultation: tool({
    description: 'Get information about free skin consultations. Use when user asks about consultations, skin analysis, or getting advice.',
    inputSchema: z.object({}),
    execute: async () => {
      return {
        success: true,
        message: 'We offer FREE skin consultations to help you understand your skin better and recommend the perfect treatments.',
        benefits: [
          'Professional skin analysis',
          'Personalized treatment recommendations',
          'Product suggestions for your skin type',
          'No obligation to book'
        ],
        duration: '15-20 minutes',
        consultationLink: '/consultation'
      }
    }
  }),

  // Gift card info
  getGiftCards: tool({
    description: 'Get information about gift cards. Use when user asks about gifts, gift cards, or gifting spa services.',
    inputSchema: z.object({}),
    execute: async () => {
      return {
        success: true,
        message: 'Give the gift of relaxation! Dermaspace gift cards are perfect for any occasion.',
        options: ['₦25,000', '₦50,000', '₦100,000', 'Custom Amount'],
        validity: '12 months from purchase',
        delivery: 'Digital delivery via email or physical card',
        giftCardLink: '/gift-cards'
      }
    }
  }),

  // Check if user is logged in
  checkLoginStatus: tool({
    description: 'Check if the user is currently logged in. Use when you need to know their authentication status.',
    inputSchema: z.object({}),
    execute: async () => {
      const cookieStore = await cookies()
      const sessionId = cookieStore.get('session_id')?.value
      
      if (!sessionId) {
        return { loggedIn: false, message: 'You are not signed in.' }
      }
      
      try {
        const sessions = await sql`
          SELECT u.first_name FROM sessions s
          JOIN users u ON s.user_id = u.id
          WHERE s.id = ${sessionId} AND s.expires_at > NOW()
        `
        
        if (sessions.length === 0) {
          return { loggedIn: false, message: 'Your session has expired. Please sign in again.' }
        }
        
        return { loggedIn: true, name: sessions[0].first_name }
      } catch {
        return { loggedIn: false, message: 'Could not verify login status.' }
      }
    }
  }),

  // Send password reset email (works for guests - just needs email)
  sendPasswordResetEmail: tool({
    description: "Send a password reset link to a user's email. Use when the user says they forgot their password, can't log in, or wants to reset their password. Only requires their email address.",
    inputSchema: z.object({
      email: z.string().email().describe('The email address of the account')
    }),
    execute: async ({ email }) => {
      try {
        const users = await sql`
          SELECT id, email, first_name
          FROM users
          WHERE LOWER(email) = LOWER(${email})
        `

        // Generic success response to avoid email enumeration
        if (users.length === 0) {
          return {
            success: true,
            sent: true,
            email,
            message: `If an account with ${email} exists, a password reset link has been sent. Please check your inbox and spam folder.`
          }
        }

        const user = users[0]
        const resetToken = randomBytes(32).toString('hex')
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000)

        await sql`
          UPDATE users
          SET password_reset_token = ${resetToken},
              password_reset_expires = ${resetExpires.toISOString()}
          WHERE id = ${user.id}
        `

        const emailSent = await sendPasswordResetEmail(user.email, user.first_name, resetToken)

        return {
          success: true,
          sent: emailSent,
          email: user.email,
          message: emailSent
            ? `A password reset link has been sent to ${user.email}. The link expires in 1 hour.`
            : `Reset token generated but email delivery failed. Please try again or contact support.`,
          resetLink: '/forgot-password'
        }
      } catch (error) {
        console.error('[v0] sendPasswordResetEmail error:', error)
        return { success: false, message: 'Could not send password reset email. Please try /forgot-password directly.' }
      }
    }
  }),

  // Resend email verification (requires login)
  resendVerificationEmail: tool({
    description: "Resend the email verification link to the currently logged-in user. Use when the user says they didn't receive their verification email or want it resent.",
    inputSchema: z.object({}),
    execute: async () => {
      const cookieStore = await cookies()
      const sessionId = cookieStore.get('session_id')?.value

      if (!sessionId) {
        return { success: false, message: 'Please sign in first to resend your verification email.' }
      }

      try {
        const rows = await sql`
          SELECT u.id, u.email, u.first_name, u.email_verified, u.verification_token
          FROM sessions s
          JOIN users u ON s.user_id = u.id
          WHERE s.id = ${sessionId} AND s.expires_at > NOW()
        `

        if (rows.length === 0) {
          return { success: false, message: 'Session expired. Please sign in again.' }
        }

        const user = rows[0]

        if (user.email_verified) {
          return { success: true, alreadyVerified: true, message: 'Your email is already verified.' }
        }

        let token = user.verification_token as string | null
        if (!token) {
          token = randomBytes(32).toString('hex')
          await sql`
            UPDATE users SET verification_token = ${token} WHERE id = ${user.id}
          `
        }

        const emailSent = await sendVerificationEmail(user.email, user.first_name, token)

        return {
          success: true,
          sent: emailSent,
          email: user.email,
          message: emailSent
            ? `Verification email sent to ${user.email}. Please check your inbox.`
            : 'Could not send verification email at the moment. Please try again.'
        }
      } catch (error) {
        console.error('[v0] resendVerificationEmail error:', error)
        return { success: false, message: 'Could not resend verification email.' }
      }
    }
  }),

  // Get notifications / alerts for the logged-in user
  getNotifications: tool({
    description: "Get the user's unread notifications, alerts, or recent activity. Use when user asks about notifications, alerts, or recent account activity.",
    inputSchema: z.object({}),
    execute: async () => {
      const cookieStore = await cookies()
      const sessionId = cookieStore.get('session_id')?.value

      if (!sessionId) {
        return { success: false, message: 'Please sign in to view notifications.' }
      }

      try {
        const sessions = await sql`
          SELECT user_id FROM sessions WHERE id = ${sessionId} AND expires_at > NOW()
        `
        if (sessions.length === 0) {
          return { success: false, message: 'Session expired.' }
        }

        const userId = sessions[0].user_id

        // Assemble recent activity signals from known tables
        const recentBookings = await sql`
          SELECT service_name, appointment_date, status
          FROM bookings
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
          LIMIT 3
        `.catch(() => [])

        const recentTx = await sql`
          SELECT description, amount, status, created_at
          FROM wallet_transactions
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
          LIMIT 3
        `.catch(() => [])

        return {
          success: true,
          recentBookings: (recentBookings as Array<Record<string, unknown>>).map(b => ({
            service: b.service_name,
            date: b.appointment_date,
            status: b.status
          })),
          recentTransactions: (recentTx as Array<Record<string, unknown>>).map(t => ({
            description: t.description,
            amount: `₦${Number(t.amount).toLocaleString()}`,
            status: t.status
          }))
        }
      } catch (error) {
        console.error('[v0] getNotifications error:', error)
        return { success: false, message: 'Could not fetch notifications.' }
      }
    }
  }),

  // Get support ticket info
  getSupportTickets: tool({
    description: "Get the user's support tickets. Use when user asks about their tickets, support requests, or complaints they've submitted.",
    inputSchema: z.object({}),
    execute: async () => {
      const cookieStore = await cookies()
      const sessionId = cookieStore.get('session_id')?.value

      if (!sessionId) {
        return { success: false, message: 'Please sign in to view your tickets.' }
      }

      try {
        const sessions = await sql`
          SELECT user_id FROM sessions WHERE id = ${sessionId} AND expires_at > NOW()
        `
        if (sessions.length === 0) return { success: false, message: 'Session expired.' }

        const userId = sessions[0].user_id
        const tickets = await sql`
          SELECT id, subject, status, priority, created_at
          FROM support_tickets
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
          LIMIT 5
        `.catch(() => [])

        return {
          success: true,
          tickets: (tickets as Array<Record<string, unknown>>).map(t => ({
            id: t.id,
            subject: t.subject,
            status: t.status,
            priority: t.priority,
            created: t.created_at
          })),
          supportLink: '/dashboard/support'
        }
      } catch {
        return { success: true, tickets: [], supportLink: '/dashboard/support' }
      }
    }
  })
}

const systemPrompt = `You are Derma, the intelligent AI assistant for Dermaspace - a premium boutique spa in Lagos, Nigeria. You have deep knowledge of every feature on the website and can take real actions for users.

PERSONALITY:
- Warm, professional, knowledgeable, empathetic
- Address users by name when you know it
- Be concise but helpful (2-4 sentences for simple questions; longer only when needed)
- NEVER say you can't do something - instead, use your tools or direct the user to the right page
- Never expose internal IDs, tokens, or admin-only information

TOOLS AVAILABLE (use them proactively instead of guessing):
- getWalletBalance — real-time wallet balance
- getTransactionHistory — recent wallet transactions
- getBookings — user's upcoming appointments
- createBooking — prepare a new booking (service, location, date, time)
- getServices — live service catalog (facial / body / nail / waxing / all)
- getLocations — addresses, hours, phone numbers
- getUserProfile — logged-in user's profile
- getPackages — memberships, couples, bridal, etc.
- getConsultation — free skin consultation info
- getGiftCards — gift card options and delivery
- getNotifications — recent activity summary
- getSupportTickets — user's support tickets
- navigateToPage — direct the user to any page on the site
- checkLoginStatus — verify session
- sendPasswordResetEmail — actually send a password reset link to an email address
- resendVerificationEmail — actually resend the verification email for the logged-in user

SITEMAP (use navigateToPage or provide the path):
- / — Homepage
- /about — About Dermaspace
- /services — All services index
- /services/facial-treatments — Facials
- /services/body-treatments — Body treatments / massages
- /services/nail-care — Manicure / pedicure / nail art
- /services/waxing — Waxing services
- /services/[slug] — Individual service detail pages
- /laser-tech — Laser technology services
- /booking — Book an appointment
- /consultation — Request a free skin consultation
- /packages — Spa packages (couples, bridal, etc.)
- /membership — Platinum membership
- /gift-cards — Buy a gift card
- /gallery — Photo gallery
- /contact — Contact form & locations
- /signup — Create account
- /signin — Sign in
- /signin/2fa — Two-factor authentication step
- /forgot-password — Start password reset (you can also trigger sendPasswordResetEmail directly)
- /reset-password — Complete password reset with token from email
- /verify-email — Verify email with token from email
- /complete-profile — Finish profile (username, etc.) after signup
- /accept-invite — Accept a staff invitation
- /dashboard — User dashboard (wallet overview, bookings)
- /dashboard/wallet — Full wallet page
- /dashboard/settings — Profile, password, 2FA, preferences
- /dashboard/support — Support tickets
- /feedback — Leave feedback
- /survey — Customer survey
- /continue-payment — Resume an unfinished payment

ACCOUNT SECURITY FEATURES THE SITE SUPPORTS:
- Password reset via email token (use sendPasswordResetEmail)
- Email verification via token (use resendVerificationEmail)
- Two-factor authentication at /signin/2fa and /dashboard/settings
- New-device login alerts via email

RESPONSE GUIDELINES:
- When the user asks about real data (balance, bookings, profile, transactions, tickets), CALL THE TOOL — never guess.
- When the user asks about services or pricing, call getServices — do not invent prices.
- When the user forgets their password, ask for the email they signed up with, then call sendPasswordResetEmail.
- When the user didn't receive their verification email, call resendVerificationEmail (if they are signed in) or direct them to /signup if not.
- For booking, gather service, preferred location (Victoria Island or Ikoyi), date, and time, then call createBooking. Always confirm details before finalizing.
- For navigation, call navigateToPage so the UI can render a jump link.
- If an action requires sign-in and the user is not logged in, politely tell them and provide /signin.
- Keep answers short and actionable. Offer one clear next step.

DERMASPACE INFO:
- Victoria Island: Plot 5, Block A, Adeola Odeku Street | +234 901 797 2919
- Ikoyi: 12 Bourdillon Road | +234 816 776 4757
- Hours: Mon-Sat 9AM-7PM, Sunday by appointment
- Email: hello@dermaspaceng.com`

function buildUserContext(
  userInfo: { name?: string; preferences?: { skinType?: string; concerns?: string[]; services?: string[]; location?: string } },
  accountAccessConsent?: boolean
) {
  let context = ''

  if (userInfo?.name) {
    context += `\n\nUSER: ${userInfo.name}. Address them by name.`
  }

  if (userInfo?.preferences) {
    const prefs = userInfo.preferences
    context += '\n\nUSER PREFERENCES:'
    if (prefs.skinType) context += `\n- Skin: ${prefs.skinType}`
    if (prefs.concerns?.length) context += `\n- Concerns: ${prefs.concerns.join(', ')}`
    if (prefs.services?.length) context += `\n- Interests: ${prefs.services.join(', ')}`
    if (prefs.location) context += `\n- Location: ${prefs.location}`
  }

  if (accountAccessConsent) {
    context += '\n\nACCOUNT ACCESS: The user has granted consent for you to access their account data (wallet, bookings, profile, transactions, tickets, notifications). Use the account tools freely when relevant.'
  } else {
    context += '\n\nACCOUNT ACCESS: The user has NOT yet granted account access. Answer general questions freely, but before calling account-data tools, acknowledge you will need access and let the UI handle the consent prompt.'
  }

  return context
}

export async function POST(request: Request) {
  try {
    const { messages, userInfo, accountAccessConsent } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
    }

    const enhancedPrompt = systemPrompt + buildUserContext(userInfo || {}, Boolean(accountAccessConsent))

    // Convert messages for AI SDK 6
    const modelMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))

    console.log('[v0] Chat API called with', modelMessages.length, 'messages')

    if (!process.env.GROQ_API_KEY) {
      console.error('[v0] GROQ_API_KEY is missing!')
      return NextResponse.json(
        { error: 'GROQ_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: enhancedPrompt,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(5), // Allow up to 5 tool calls
    })

    console.log('[v0] Returning stream response')
    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('[v0] Chat error:', error)
    return NextResponse.json(
      { message: "I apologize, but I'm having trouble connecting. Please try again or call us at +234 901 797 2919." },
      { status: 500 }
    )
  }
}
