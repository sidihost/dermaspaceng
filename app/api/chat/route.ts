import { streamText, tool, stepCountIs, type ModelMessage } from 'ai'
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { sql } from '@/lib/db'
import { sendPasswordResetEmail, sendVerificationEmail } from '@/lib/email'
import { getChatModelChain, type ProviderPick } from '@/lib/ai-chain'

// Provider selection now lives in `lib/ai-chain.ts`. That module
// exposes an ordered chain of text + tool-calling models — Mistral
// → Groq → Fireworks → Cloudflare Workers AI → Vercel AI Gateway —
// and we iterate through it below. Any provider whose env var is
// set is included; the Gateway is always the last resort.
//
// Stream setup is synchronous (`streamText()` returns immediately;
// the HTTP body is produced lazily as it's consumed), so swapping
// providers mid-stream isn't actually possible. Instead, we fall
// through the chain only on SYNC setup failures (missing/invalid
// credentials, invalid model names). Async failures are surfaced
// through the stream's onError handler to the user.

export const maxDuration = 30

// Define all the tools the AI can use
const tools = {
  // Get user's wallet balance
  getWalletBalance: tool({
    description:
      "Get the current wallet balance for the logged-in user. Use this whenever the user asks about their balance, wallet, money, credits, or how much they have.",
    inputSchema: z.object({}),
    execute: async () => {
      const cookieStore = await cookies()
      const sessionId = cookieStore.get('session_id')?.value

      if (!sessionId) {
        return {
          success: false,
          loggedIn: false,
          message: 'Please sign in to check your wallet balance.',
          link: '/signin',
        }
      }

      try {
        const sessions = await sql`
          SELECT user_id FROM sessions WHERE id = ${sessionId} AND expires_at > NOW()
        `
        if (sessions.length === 0) {
          return {
            success: false,
            loggedIn: false,
            message: 'Your session expired. Please sign in again.',
            link: '/signin',
          }
        }

        const userId = sessions[0].user_id
        const wallets = await sql`
          SELECT balance, currency FROM wallets WHERE user_id = ${userId}
        `

        // First-time users don't have a wallet row until they fund or transact.
        // Returning 0 (not an error) matches the dashboard behaviour.
        const balance = wallets.length === 0 ? 0 : Number(wallets[0].balance ?? 0)
        const currency = wallets.length === 0 ? 'NGN' : (wallets[0].currency as string) || 'NGN'

        // Format like the dashboard wallet card: no decimals for whole Naira.
        const formatted = new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(balance)

        return {
          success: true,
          loggedIn: true,
          balance,
          currency,
          formatted,
          walletLink: '/dashboard/wallet',
        }
      } catch (error) {
        console.error('[v0] getWalletBalance error:', error)
        return { success: false, message: 'Could not fetch your wallet balance right now.' }
      }
    },
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
        // Join booking_services to get the actual treatment names
        const bookings = await sql`
          SELECT b.id, b.booking_reference, b.location_name, b.appointment_date,
                 b.appointment_time, b.status, b.total_price,
                 COALESCE(
                   (SELECT string_agg(bs.treatment_name, ', ' ORDER BY bs.created_at)
                    FROM booking_services bs WHERE bs.booking_id = b.id),
                   'Service'
                 ) AS services
          FROM bookings b
          WHERE b.user_id = ${userId}
            AND b.appointment_date >= CURRENT_DATE
            AND b.status IN ('pending', 'confirmed')
          ORDER BY b.appointment_date ASC, b.appointment_time ASC
          LIMIT 5
        `

        if (bookings.length === 0) {
          return { success: true, bookings: [], message: 'No upcoming appointments found.' }
        }

        return {
          success: true,
          bookings: bookings.map(b => ({
            reference: b.booking_reference,
            service: b.services,
            location: b.location_name,
            date: b.appointment_date,
            time: b.appointment_time,
            status: b.status,
            totalPrice: `₦${Math.round(Number(b.total_price) / 100).toLocaleString()}`
          }))
        }
      } catch (error) {
        console.error('[v0] getBookings error:', error)
        return { success: true, bookings: [], message: 'No upcoming appointments found.' }
      }
    }
  }),

  // Get transaction history
  getTransactionHistory: tool({
    description: "Get the user's recent wallet transactions. Use when user asks about their payment history, transactions, or spending.",
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
        // Real table is `transactions` (see scripts/001-wallet-system.sql).
        // `wallet_transactions` was a typo that silently returned nothing.
        const transactions = await sql`
          SELECT type, amount, description, status, payment_method, created_at
          FROM transactions
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `

        if (transactions.length === 0) {
          return { success: true, transactions: [], message: 'No transactions yet.' }
        }

        return {
          success: true,
          transactions: transactions.map((t) => ({
            type: t.type,
            amount: `��${Number(t.amount).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`,
            description: t.description || (t.type === 'credit' ? 'Wallet top-up' : 'Payment'),
            status: t.status,
            paymentMethod: t.payment_method,
            date: new Date(t.created_at as string).toLocaleDateString('en-NG', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }),
          })),
        }
      } catch (error) {
        console.error('[v0] getTransactionHistory error:', error)
        return { success: false, message: 'Could not fetch transactions right now.' }
      }
    },
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

  // Render a real interactive map inline in the chat. This is the
  // "show, don't tell" counterpart to getLocations — instead of a
  // list of addresses, the UI mounts the same Leaflet map used on
  // /locations, complete with pulsing branch markers, user-location
  // lookup, turn-by-turn directions, and a full-screen expander.
  //
  // We keep the payload tiny (just the focal branch + flag) because
  // the component itself hard-codes the coordinates of both Lagos
  // branches — there's no need to round-trip them through the model.
  showLocationsMap: tool({
    description:
      'Render a live, interactive map inside the chat with pulsing markers for both Dermaspace branches, "use my location", driving / walking / cycling / motorbike directions, and turn-by-turn guidance. USE THIS (not getLocations) whenever the user asks to SEE where we are, wants the map, wants directions, asks "can you show me on a map", "where exactly", "how do I get there", or any spatial / navigational question. Pair it with a one-sentence friendly intro in your reply.',
    inputSchema: z.object({
      branch: z
        .enum(['vi', 'ikoyi'])
        .optional()
        .describe(
          "Which branch to focus the map on. 'vi' for Victoria Island, 'ikoyi' for Ikoyi. Omit when the user is comparing both or hasn't specified."
        ),
    }),
    execute: async ({ branch }) => {
      return {
        success: true,
        showMap: true,
        branchId: branch ?? null,
        branches: [
          { id: 'vi', name: 'Victoria Island', lat: 6.4302, lng: 3.4217 },
          { id: 'ikoyi', name: 'Ikoyi', lat: 6.4481, lng: 3.4316 },
        ],
        fullMapLink: '/locations',
      }
    },
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

        // Assemble recent activity signals from known tables.
        // Bookings table does NOT have a service_name column — services live in
        // booking_services.treatment_name. Join + aggregate so the AI sees a
        // readable service description.
        const recentBookings = await sql`
          SELECT b.booking_reference, b.location_name, b.appointment_date, b.status,
                 COALESCE(
                   (SELECT string_agg(bs.treatment_name, ', ' ORDER BY bs.created_at)
                    FROM booking_services bs WHERE bs.booking_id = b.id),
                   'Appointment'
                 ) AS service
          FROM bookings b
          WHERE b.user_id = ${userId}
          ORDER BY b.created_at DESC
          LIMIT 3
        `.catch(() => [] as Array<Record<string, unknown>>)

        // Real table is `transactions`, not `wallet_transactions`.
        const recentTx = await sql`
          SELECT description, amount, type, status, created_at
          FROM transactions
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
          LIMIT 3
        `.catch(() => [] as Array<Record<string, unknown>>)

        return {
          success: true,
          recentBookings: (recentBookings as Array<Record<string, unknown>>).map((b) => ({
            reference: b.booking_reference,
            service: b.service,
            location: b.location_name,
            date: b.appointment_date,
            status: b.status,
          })),
          recentTransactions: (recentTx as Array<Record<string, unknown>>).map((t) => ({
            description: t.description || (t.type === 'credit' ? 'Wallet top-up' : 'Payment'),
            amount: `₦${Number(t.amount).toLocaleString('en-NG')}`,
            type: t.type,
            status: t.status,
          })),
        }
      } catch (error) {
        console.error('[v0] getNotifications error:', error)
        return { success: false, message: 'Could not fetch notifications.' }
      }
    }
  }),

  // Join the online-booking waitlist
  joinBookingWaitlist: tool({
    description: "Add a user's email to the online-booking waitlist so they get notified when online booking launches. Use when the user wants to be notified about booking availability or join the waitlist.",
    inputSchema: z.object({
      email: z.string().email().describe("The user's email address"),
    }),
    execute: async ({ email }) => {
      try {
        const clean = email.trim().toLowerCase()
        const existing = await sql`
          SELECT id FROM booking_waitlist WHERE email = ${clean} LIMIT 1
        `
        if (existing.length > 0) {
          return {
            success: true,
            alreadyOnList: true,
            email: clean,
            message: `${clean} is already on the booking waitlist. We'll email when online booking goes live.`,
          }
        }

        let userId: string | null = null
        try {
          const cookieStore = await cookies()
          const sessionId = cookieStore.get('session_id')?.value
          if (sessionId) {
            const s = await sql`
              SELECT user_id FROM sessions WHERE id = ${sessionId} AND expires_at > NOW() LIMIT 1
            `
            if (s.length > 0) userId = s[0].user_id as string
          }
        } catch {}

        const id = randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
        await sql`
          INSERT INTO booking_waitlist (id, email, user_id, source)
          VALUES (${id}, ${clean}, ${userId}, 'ai_chat')
        `

        return {
          success: true,
          alreadyOnList: false,
          email: clean,
          message: `${clean} added to the booking waitlist. You'll be emailed the moment online booking launches.`,
        }
      } catch (error) {
        console.error('[v0] joinBookingWaitlist error:', error)
        return {
          success: false,
          message: "Couldn't join the waitlist right now. Please try /booking and use the form.",
        }
      }
    },
  }),

  // Book a free skin consultation (real DB insert)
  bookConsultation: tool({
    description:
      "Book a FREE in-person skin consultation for the user. Use when the user wants to schedule a consultation, skin analysis, or face-to-face advice. Collect first name, last name, email, phone, preferred location (Victoria Island or Ikoyi), date, and time before calling.",
    inputSchema: z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().min(5),
      location: z.enum(['Victoria Island', 'Ikoyi']),
      appointmentDate: z.string().describe('ISO date (YYYY-MM-DD) for the consultation'),
      appointmentTime: z.string().describe('Time like 10:00 AM or 14:30'),
      concerns: z.array(z.string()).nullable().describe('Optional list of skin concerns'),
      notes: z.string().nullable().describe('Optional extra notes from the user'),
    }),
    execute: async ({ firstName, lastName, email, phone, location, appointmentDate, appointmentTime, concerns, notes }) => {
      try {
        let userId: string | null = null
        try {
          const cookieStore = await cookies()
          const sessionId = cookieStore.get('session_id')?.value
          if (sessionId) {
            const s = await sql`
              SELECT user_id FROM sessions WHERE id = ${sessionId} AND expires_at > NOW() LIMIT 1
            `
            if (s.length > 0) userId = s[0].user_id as string
          }
        } catch {}

        const id = randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
        const concernsJson = JSON.stringify(concerns ?? [])
        await sql`
          INSERT INTO consultations (
            id, user_id, first_name, last_name, email, phone, location,
            appointment_date, appointment_time, concerns, notes, status
          ) VALUES (
            ${id}, ${userId}, ${firstName}, ${lastName}, ${email}, ${phone}, ${location},
            ${appointmentDate}, ${appointmentTime}, ${concernsJson}::jsonb, ${notes ?? null}, 'pending'
          )
        `

        return {
          success: true,
          consultationId: id,
          message: `Your free consultation is booked at ${location} on ${appointmentDate} at ${appointmentTime}. We'll confirm by email at ${email}.`,
          location,
          date: appointmentDate,
          time: appointmentTime,
          consultationLink: '/consultation',
        }
      } catch (error) {
        console.error('[v0] bookConsultation error:', error)
        return {
          success: false,
          message: "Couldn't save that consultation. Please try /consultation directly.",
        }
      }
    },
  }),

  // Create a support ticket (requires login)
  createSupportTicket: tool({
    description:
      "Create a new support ticket for the logged-in user. ONLY call this after you have asked clarifying follow-up questions and collected: (1) the category, (2) a short subject line, (3) a clear description of the problem, and (4) the priority. Never invent these fields — ask the user for anything you don't have. Use when the user has a complaint, issue, question for staff, payment problem, or wants to file a formal request.",
    inputSchema: z.object({
      category: z
        .enum(['booking', 'treatment', 'account', 'payment', 'feedback', 'other'])
        .describe(
          "The category of the issue. Must match one of: booking, treatment, account, payment, feedback, other.",
        ),
      subject: z
        .string()
        .min(3)
        .describe(
          'Short subject line summarising the issue (e.g. "Unable to book Saturday slot").',
        ),
      message: z
        .string()
        .min(20)
        .describe(
          "Detailed description of the user's issue. Must be at least 20 characters and written in the user's own words — do NOT paraphrase with invented details.",
        ),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).nullable(),
    }),
    execute: async ({ category, subject, message, priority }) => {
      const cookieStore = await cookies()
      const sessionId = cookieStore.get('session_id')?.value
      if (!sessionId) {
        return {
          success: false,
          message: 'Please sign in to submit a support ticket.',
          supportLink: '/signin',
        }
      }
      try {
        const rows = await sql`
          SELECT u.id, u.first_name, u.last_name, u.email, u.phone
          FROM sessions s JOIN users u ON s.user_id = u.id
          WHERE s.id = ${sessionId} AND s.expires_at > NOW() LIMIT 1
        `
        if (rows.length === 0) {
          return { success: false, message: 'Session expired. Please sign in again.' }
        }
        const user = rows[0]
        const year = new Date().getFullYear()
        const ticketId = `DS-${year}-${Math.floor(Math.random() * 1000000)
          .toString()
          .padStart(6, '0')}`

        await sql`
          INSERT INTO support_tickets (
            ticket_id, user_id, email, name, phone, category, subject, message, priority
          ) VALUES (
            ${ticketId},
            ${user.id},
            ${user.email},
            ${user.first_name + ' ' + user.last_name},
            ${user.phone ?? null},
            ${category},
            ${subject},
            ${message},
            ${priority ?? 'medium'}
          )
        `

        return {
          success: true,
          ticketId,
          subject,
          category,
          priority: priority ?? 'medium',
          message: `Ticket ${ticketId} created. Our team will reply within 24 hours.`,
          supportLink: '/dashboard/support',
          ticketLink: `/dashboard/support/${ticketId}`,
        }
      } catch (error) {
        console.error('[v0] createSupportTicket error:', error)
        return {
          success: false,
          message: "Couldn't create the ticket. Please try /dashboard/support.",
        }
      }
    },
  }),

  // Search services by keyword
  searchServices: tool({
    description:
      'Search Dermaspace services by keyword (e.g. "anti aging", "hydrafacial", "manicure"). Use when the user asks about a specific treatment or isn\'t sure which category it falls in.',
    inputSchema: z.object({
      query: z.string().min(1).describe('Keyword or phrase to search for'),
    }),
    execute: async ({ query }) => {
      const q = query.toLowerCase()
      const catalog: Array<{ name: string; price: string; category: string; link: string }> = [
        { name: 'Signature Facial', price: '₦25,000', category: 'Facials', link: '/services/facial-treatments' },
        { name: 'HydraFacial', price: '₦45,000', category: 'Facials', link: '/services/facial-treatments' },
        { name: 'Anti-Aging Facial', price: '₦35,000', category: 'Facials', link: '/services/facial-treatments' },
        { name: 'Acne Treatment Facial', price: '₦30,000', category: 'Facials', link: '/services/facial-treatments' },
        { name: 'Brightening Facial', price: '₦32,000', category: 'Facials', link: '/services/facial-treatments' },
        { name: 'Swedish Massage', price: '₦25,000 - ₦45,000', category: 'Body', link: '/services/body-treatments' },
        { name: 'Deep Tissue Massage', price: '₦30,000 - ₦50,000', category: 'Body', link: '/services/body-treatments' },
        { name: 'Hot Stone Massage', price: '₦35,000 - ₦55,000', category: 'Body', link: '/services/body-treatments' },
        { name: 'Body Scrub', price: '₦28,000', category: 'Body', link: '/services/body-treatments' },
        { name: 'Body Wrap', price: '₦32,000', category: 'Body', link: '/services/body-treatments' },
        { name: 'Classic Manicure', price: '₦8,000', category: 'Nails', link: '/services/nail-care' },
        { name: 'Gel Manicure', price: '₦12,000', category: 'Nails', link: '/services/nail-care' },
        { name: 'Classic Pedicure', price: '₦10,000', category: 'Nails', link: '/services/nail-care' },
        { name: 'Spa Pedicure', price: '₦15,000', category: 'Nails', link: '/services/nail-care' },
        { name: 'Nail Art', price: 'From ₦3,000', category: 'Nails', link: '/services/nail-care' },
        { name: 'Full Body Wax', price: '₦35,000 - ₦55,000', category: 'Waxing', link: '/services/waxing' },
        { name: 'Bikini Waxing', price: '₦10,000 - ₦18,000', category: 'Waxing', link: '/services/waxing' },
        { name: 'Legs Waxing', price: '₦12,000 - ₦20,000', category: 'Waxing', link: '/services/waxing' },
        { name: 'Laser Hair Removal', price: 'From ₦25,000', category: 'Laser', link: '/laser-tech' },
      ]
      const matches = catalog.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          q.includes(s.name.toLowerCase())
      )
      return {
        success: true,
        query,
        matches: matches.slice(0, 6),
        noResults: matches.length === 0,
        servicesLink: '/services',
      }
    },
  }),

  // ---------- ACTION TOOLS (write/update data) ----------

  // Fund wallet: returns a Paystack checkout URL the user can open
  fundWallet: tool({
    description:
      "Start funding the logged-in user's wallet. Returns a secure Paystack checkout link they can open to pay. Use when the user wants to add money, top up, deposit, recharge, or fund their wallet. Ask for the amount in Naira if not provided (minimum ₦100).",
    inputSchema: z.object({
      amount: z.number().min(100).describe('Amount to fund in Naira (minimum 100)'),
    }),
    execute: async ({ amount }) => {
      const cookieStore = await cookies()
      const sessionId = cookieStore.get('session_id')?.value
      if (!sessionId) {
        return { success: false, message: 'Please sign in to fund your wallet.', link: '/signin' }
      }
      try {
        const rows = await sql`
          SELECT u.id, u.email, u.first_name, u.last_name
          FROM sessions s JOIN users u ON s.user_id = u.id
          WHERE s.id = ${sessionId} AND s.expires_at > NOW() LIMIT 1
        `
        if (rows.length === 0) {
          return { success: false, message: 'Session expired. Please sign in again.', link: '/signin' }
        }
        const user = rows[0]

        // Use the existing wallet fund endpoint so all business rules stay in one place
        const base = process.env.NEXT_PUBLIC_APP_URL || ''
        const res = await fetch(`${base}/api/wallet/fund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Forward the user's cookie so getCurrentUser resolves inside the endpoint
            cookie: `session_id=${sessionId}`,
          },
          body: JSON.stringify({ amount }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.authorization_url) {
          return {
            success: false,
            message: data?.error || 'Could not start wallet funding right now.',
            link: '/dashboard/wallet',
          }
        }
        return {
          success: true,
          amount: `₦${amount.toLocaleString()}`,
          paymentLink: data.authorization_url,
          message: `Opening Paystack to fund ₦${amount.toLocaleString()} for ${user.first_name}. The payment is secure and will reflect instantly.`,
        }
      } catch (error) {
        console.error('[v0] fundWallet error:', error)
        return {
          success: false,
          message: 'Could not start wallet funding. Please try /dashboard/wallet directly.',
          link: '/dashboard/wallet',
        }
      }
    },
  }),

  // Cancel an upcoming booking
  cancelBooking: tool({
    description:
      "Cancel an upcoming booking for the logged-in user. Use when the user wants to cancel, remove, or call off an appointment. The user must provide the booking reference (e.g. DS-AB12CD34) — if they don't know it, first call getBookings and show them the list so they can pick one.",
    inputSchema: z.object({
      bookingReference: z
        .string()
        .min(3)
        .describe('The booking reference, e.g. DS-AB12CD34'),
      reason: z.string().nullable().describe('Optional reason for the cancellation'),
    }),
    execute: async ({ bookingReference, reason }) => {
      const cookieStore = await cookies()
      const sessionId = cookieStore.get('session_id')?.value
      if (!sessionId) {
        return { success: false, message: 'Please sign in to cancel a booking.', link: '/signin' }
      }
      try {
        const sessions = await sql`
          SELECT user_id FROM sessions WHERE id = ${sessionId} AND expires_at > NOW()
        `
        if (sessions.length === 0) {
          return { success: false, message: 'Session expired. Please sign in again.' }
        }
        const userId = sessions[0].user_id
        const ref = bookingReference.trim().toUpperCase()

        const existing = await sql`
          SELECT id, status, appointment_date, appointment_time, location_name
          FROM bookings
          WHERE user_id = ${userId} AND booking_reference = ${ref}
          LIMIT 1
        `
        if (existing.length === 0) {
          return {
            success: false,
            message: `No booking found with reference ${ref}. Check /dashboard for your bookings.`,
          }
        }
        const b = existing[0]
        if (b.status === 'cancelled') {
          return { success: true, alreadyCancelled: true, message: `Booking ${ref} is already cancelled.` }
        }
        if (b.status === 'completed') {
          return { success: false, message: `Booking ${ref} is already completed and cannot be cancelled.` }
        }

        await sql`
          UPDATE bookings
          SET status = 'cancelled',
              notes = COALESCE(notes, '') || ${reason ? `\nCancelled via AI: ${reason}` : '\nCancelled via AI chat'},
              updated_at = NOW()
          WHERE id = ${b.id}
        `

        return {
          success: true,
          reference: ref,
          message: `Booking ${ref} (${b.location_name}, ${b.appointment_date} at ${b.appointment_time}) has been cancelled.`,
          link: '/dashboard',
        }
      } catch (error) {
        console.error('[v0] cancelBooking error:', error)
        return { success: false, message: 'Could not cancel the booking. Please try /dashboard.' }
      }
    },
  }),

  // Update the logged-in user's profile (name, phone)
  updateProfile: tool({
    description:
      "Update the logged-in user's profile information: first name, last name, or phone number. Use when the user wants to change/update their name or phone. Only include the fields the user actually wants to change.",
    inputSchema: z.object({
      firstName: z.string().min(1).nullable(),
      lastName: z.string().min(1).nullable(),
      phone: z.string().min(5).nullable(),
    }),
    execute: async ({ firstName, lastName, phone }) => {
      const cookieStore = await cookies()
      const sessionId = cookieStore.get('session_id')?.value
      if (!sessionId) {
        return { success: false, message: 'Please sign in to update your profile.', link: '/signin' }
      }
      try {
        const sessions = await sql`
          SELECT user_id FROM sessions WHERE id = ${sessionId} AND expires_at > NOW()
        `
        if (sessions.length === 0) {
          return { success: false, message: 'Session expired. Please sign in again.' }
        }
        const userId = sessions[0].user_id

        const updates: string[] = []
        if (firstName) updates.push('first name')
        if (lastName) updates.push('last name')
        if (phone) updates.push('phone number')

        if (updates.length === 0) {
          return { success: false, message: 'No fields provided to update.' }
        }

        await sql`
          UPDATE users SET
            first_name = COALESCE(${firstName}, first_name),
            last_name  = COALESCE(${lastName}, last_name),
            phone      = COALESCE(${phone}, phone),
            updated_at = NOW()
          WHERE id = ${userId}
        `

        return {
          success: true,
          updated: updates,
          message: `Updated your ${updates.join(', ')}. Changes are saved.`,
          link: '/dashboard/settings',
        }
      } catch (error) {
        console.error('[v0] updateProfile error:', error)
        return { success: false, message: 'Could not update your profile right now.' }
      }
    },
  }),

  // Update user preferences (skin type, concerns, preferred services, location)
  updatePreferences: tool({
    description:
      "Update the logged-in user's personalisation preferences: skin type, concerns, preferred service categories, or preferred location. Use when the user wants to change their skin profile, interests, or default branch.",
    inputSchema: z.object({
      skinType: z
        .enum(['Dry', 'Oily', 'Combination', 'Sensitive', 'Normal'])
        .nullable()
        .describe('Skin type'),
      concerns: z
        .array(z.string())
        .nullable()
        .describe('Skin concerns e.g. ["Aging", "Acne", "Uneven Texture"]'),
      preferredServices: z
        .array(z.string())
        .nullable()
        .describe('Preferred service categories e.g. ["Facials", "Body Treatments"]'),
      preferredLocation: z
        .enum(['Victoria Island', 'Ikoyi'])
        .nullable()
        .describe('Preferred branch'),
    }),
    execute: async ({ skinType, concerns, preferredServices, preferredLocation }) => {
      const cookieStore = await cookies()
      const sessionId = cookieStore.get('session_id')?.value
      if (!sessionId) {
        return { success: false, message: 'Please sign in to update your preferences.', link: '/signin' }
      }
      try {
        const sessions = await sql`
          SELECT user_id FROM sessions WHERE id = ${sessionId} AND expires_at > NOW()
        `
        if (sessions.length === 0) {
          return { success: false, message: 'Session expired. Please sign in again.' }
        }
        const userId = sessions[0].user_id

        const concernsJson = concerns ? JSON.stringify(concerns) : null
        const servicesJson = preferredServices ? JSON.stringify(preferredServices) : null

        await sql`
          INSERT INTO user_preferences (
            user_id, skin_type, concerns, preferred_services, preferred_location, updated_at
          ) VALUES (
            ${userId}, ${skinType}, ${concernsJson}::jsonb, ${servicesJson}::jsonb, ${preferredLocation}, NOW()
          )
          ON CONFLICT (user_id) DO UPDATE SET
            skin_type = COALESCE(EXCLUDED.skin_type, user_preferences.skin_type),
            concerns = COALESCE(EXCLUDED.concerns, user_preferences.concerns),
            preferred_services = COALESCE(EXCLUDED.preferred_services, user_preferences.preferred_services),
            preferred_location = COALESCE(EXCLUDED.preferred_location, user_preferences.preferred_location),
            updated_at = NOW()
        `

        const changed: string[] = []
        if (skinType) changed.push(`skin type to ${skinType}`)
        if (concerns?.length) changed.push(`concerns to ${concerns.join(', ')}`)
        if (preferredServices?.length) changed.push(`interests to ${preferredServices.join(', ')}`)
        if (preferredLocation) changed.push(`preferred location to ${preferredLocation}`)

        return {
          success: true,
          message: changed.length
            ? `Updated your ${changed.join('; ')}.`
            : 'Preferences saved.',
          link: '/dashboard/settings',
        }
      } catch (error) {
        console.error('[v0] updatePreferences error:', error)
        return { success: false, message: 'Could not update preferences right now.' }
      }
    },
  }),

  // Log the user out.
  //
  // IMPORTANT: This tool does NOT actually terminate the session. It
  // only renders a confirmation card with "Yes, sign me out" and
  // "Cancel" buttons so the user can explicitly approve the action.
  // The real session deletion happens client-side when the user taps
  // the confirm button (POST /api/auth/logout + redirect). This mirrors
  // how signing out works elsewhere in the product — you should never
  // have an AI turn that silently ends a user's session without a
  // clearly tappable "are you sure" step.
  logoutUser: tool({
    description:
      'Start the sign-out flow for the currently signed-in user. This does NOT actually sign them out — it shows a confirmation card with "Yes, sign me out" and "Cancel" buttons. Use when the user says they want to sign out / log out / end their session. The UI handles the actual session termination on button tap.',
    inputSchema: z.object({}),
    execute: async () => {
      const cookieStore = await cookies()
      const sessionId = cookieStore.get('session_id')?.value
      if (!sessionId) {
        return {
          success: true,
          alreadyLoggedOut: true,
          message: "You're not signed in right now — no need to sign out.",
        }
      }
      // Return a "needs confirmation" payload. No DB writes, no cookie
      // changes. The card rendered by ToolResultCard will handle the
      // actual logout when the user taps "Yes, sign me out".
      return {
        success: true,
        needsConfirmation: true,
        action: 'confirm-logout',
        message:
          "Just to be safe — are you sure you want to sign out? You'll need to sign in again to access your wallet, bookings, and profile.",
      }
    },
  }),

  // Get current date/time so the AI can reason about "today", "tomorrow", etc.
  getCurrentDateTime: tool({
    description:
      "Get the current date and time in Lagos, Nigeria (WAT). Use whenever the user mentions relative time like 'today', 'tomorrow', 'next week', or 'this weekend' so you can calculate the correct date before booking or checking schedules.",
    inputSchema: z.object({}),
    execute: async () => {
      const now = new Date()
      // Lagos is UTC+1 with no DST
      const lagos = new Date(now.getTime() + 60 * 60 * 1000)
      const iso = lagos.toISOString()
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      return {
        success: true,
        iso,
        date: iso.slice(0, 10),
        time: lagos.toISOString().slice(11, 16),
        weekday: weekdays[lagos.getUTCDay()],
        timezone: 'Africa/Lagos (WAT, UTC+1)',
      }
    },
  }),

  // Request a staff callback
  requestCallback: tool({
    description:
      "Create a support ticket asking a Dermaspace staff member to call the user back. Use when the user says 'call me', 'can someone call me', or wants to speak to a human. Requires login.",
    inputSchema: z.object({
      reason: z.string().min(3).describe('Short reason for the callback'),
      preferredTime: z
        .string()
        .nullable()
        .describe('Optional preferred time window like "today after 3pm" or "tomorrow morning"'),
    }),
    execute: async ({ reason, preferredTime }) => {
      const cookieStore = await cookies()
      const sessionId = cookieStore.get('session_id')?.value
      if (!sessionId) {
        return {
          success: false,
          message: 'Please sign in so we know who to call back, or call us at +234 901 797 2919.',
          link: '/signin',
        }
      }
      try {
        const rows = await sql`
          SELECT u.id, u.first_name, u.last_name, u.email, u.phone
          FROM sessions s JOIN users u ON s.user_id = u.id
          WHERE s.id = ${sessionId} AND s.expires_at > NOW() LIMIT 1
        `
        if (rows.length === 0) {
          return { success: false, message: 'Session expired. Please sign in again.' }
        }
        const user = rows[0]
        const year = new Date().getFullYear()
        const ticketId = `DS-${year}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`
        const message =
          `Callback request.\nReason: ${reason}` +
          (preferredTime ? `\nPreferred time: ${preferredTime}` : '') +
          (user.phone ? `\nPhone on file: ${user.phone}` : '\nNo phone on file — ask client before calling.')

        await sql`
          INSERT INTO support_tickets (
            ticket_id, user_id, email, name, phone, category, subject, message, priority
          ) VALUES (
            ${ticketId}, ${user.id}, ${user.email},
            ${user.first_name + ' ' + user.last_name}, ${user.phone ?? null},
            'other', ${'Callback request: ' + reason.slice(0, 60)},
            ${message}, 'high'
          )
        `

        return {
          success: true,
          ticketId,
          message: `Callback requested${preferredTime ? ` for ${preferredTime}` : ''}. Our team will call you shortly on ${user.phone || 'the number on file'}.`,
          link: '/dashboard/support',
        }
      } catch (error) {
        console.error('[v0] requestCallback error:', error)
        return { success: false, message: 'Could not schedule a callback. Please call +234 901 797 2919.' }
      }
    },
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
          SELECT ticket_id, category, subject, status, priority, created_at
          FROM support_tickets
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
          LIMIT 5
        `.catch(() => [] as Array<Record<string, unknown>>)

        return {
          success: true,
          tickets: (tickets as Array<Record<string, unknown>>).map((t) => ({
            // Expose the human-readable ticket reference (e.g.
            // DS-2026-000123) — the user can quote this back to support.
            // Keep both the legacy `reference` and new `ticket_id` /
            // `created_at` / `category` keys so the UI card and any older
            // consumers keep working in lock-step with the dashboard.
            ticket_id: t.ticket_id,
            reference: t.ticket_id,
            category: t.category,
            subject: t.subject,
            status: t.status,
            priority: t.priority,
            created_at: t.created_at,
            created: t.created_at
              ? new Date(t.created_at as string).toLocaleDateString('en-NG', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : null,
          })),
          supportLink: '/dashboard/support',
        }
      } catch (error) {
        console.error('[v0] getSupportTickets error:', error)
        return { success: true, tickets: [], supportLink: '/dashboard/support' }
      }
    }
  }),

  // Web search via Tavily — used to recommend real skincare/beauty products,
  // research ingredients, or answer "what's the best X for Y" style questions.
  // We ask Tavily to prioritise shopping/health domains and always return an
  // LLM-friendly `answer` plus source results the UI renders as product cards.
  searchProducts: tool({
    description:
      "Search the web with Tavily to recommend real skincare/beauty products or look up ingredient info. " +
      "Use this when the user asks for product recommendations (e.g. 'best moisturiser for oily skin', " +
      "'what should I use for acne scars', 'recommend a sunscreen'), or when they upload a photo of their skin and " +
      "ask what to use. Always call this tool instead of inventing product names or prices.",
    inputSchema: z.object({
      query: z
        .string()
        .min(3)
        .describe(
          "Focused product query. Include skin concern + product type + any filters the user mentioned, " +
          "e.g. 'best vitamin C serum for hyperpigmentation on dark skin'."
        ),
      maxResults: z.number().int().min(1).max(8).default(5),
    }),
    execute: async ({ query, maxResults }) => {
      const apiKey = process.env.TAVILY_API_KEY
      if (!apiKey) {
        return {
          success: false,
          message: 'Web search is not configured. Please try again later.',
        }
      }
      try {
        const res = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            query,
            search_depth: 'advanced',
            include_answer: true,
            include_images: true,
            include_image_descriptions: true,
            max_results: maxResults,
            // Bias toward reputable skincare/retail sources
            include_domains: [
              'sephora.com',
              'ulta.com',
              'dermstore.com',
              'lookfantastic.com',
              'beautylish.com',
              'byrdie.com',
              'allure.com',
              'healthline.com',
              'medicalnewstoday.com',
              'paulaschoice.com',
              'cerave.com',
              'cosrx.com',
              'theordinary.com',
              'laroche-posay.us',
              'konga.com',
              'jumia.com.ng',
            ],
          }),
        })

        if (!res.ok) {
          const errText = await res.text().catch(() => '')
          console.error('[v0] Tavily error:', res.status, errText)
          return { success: false, message: 'Could not complete web search right now.' }
        }

        const data = (await res.json()) as {
          answer?: string
          results?: Array<{
            title: string
            url: string
            content: string
            score?: number
            published_date?: string
          }>
          images?: Array<string | { url: string; description?: string }>
        }

        // Try to pair each top result with an image from Tavily's image set.
        // Tavily returns images as strings OR { url, description } depending on
        // the include_image_descriptions flag.
        const imageUrls: string[] = (data.images || [])
          .map((i) => (typeof i === 'string' ? i : i?.url))
          .filter(Boolean) as string[]

        const products = (data.results || []).slice(0, maxResults).map((r, i) => {
          // Pull a domain-derived source label (e.g. "sephora.com")
          let source = ''
          try {
            source = new URL(r.url).hostname.replace(/^www\./, '')
          } catch {
            source = ''
          }
          return {
            title: r.title,
            url: r.url,
            snippet: r.content?.slice(0, 220) || '',
            source,
            image: imageUrls[i] || null,
          }
        })

        return {
          success: true,
          query,
          summary: data.answer || '',
          products,
        }
      } catch (err) {
        console.error('[v0] Tavily fetch failed:', err)
        return { success: false, message: 'Web search failed.' }
      }
    },
  }),

  // Long-term memory -------------------------------------------------
  // Save a short, human-readable fact about the user that should be
  // remembered across future conversations. The client intercepts the
  // tool result and persists it to localStorage; this server tool is
  // just the handshake that lets the model express intent.
  //
  // Facts MUST be:
  //   - Short (< 120 chars), one sentence.
  //   - About the USER, not general trivia.
  //   - Privacy-safe (no passwords, OTPs, payment data, raw IDs).
  saveMemory: tool({
    description:
      "Remember a short fact about THIS user for future conversations (e.g. 'Prefers Ikoyi branch', 'Skin reacts to fragrance', 'Saving up for a bridal package'). Call this whenever the user shares a preference, allergy, goal, or any durable personal detail you should recall later. Keep facts under 120 characters. Never store secrets (passwords, OTPs, card numbers).",
    inputSchema: z.object({
      fact: z
        .string()
        .min(3)
        .max(160)
        .describe('One-sentence fact to remember about the user.'),
    }),
    execute: async ({ fact }) => {
      const trimmed = fact.trim().replace(/\s+/g, ' ').slice(0, 160)
      if (!trimmed) return { success: false, message: 'Empty fact.' }
      return { success: true, fact: trimmed }
    },
  }),

  // Explicitly forget something previously remembered. Matches
  // case-insensitive substring on the client. Lets the user say
  // "forget that I prefer Victoria Island" in-chat and have it work.
  forgetMemory: tool({
    description:
      "Forget a previously-remembered fact. Pass the fact (or a distinctive phrase from it) to remove it from the user's long-term memory. Call this when the user explicitly asks you to forget something.",
    inputSchema: z.object({
      fact: z
        .string()
        .min(2)
        .max(160)
        .describe('Fact (or distinctive phrase) to forget.'),
    }),
    execute: async ({ fact }) => {
      return { success: true, fact: fact.trim() }
    },
  }),
}

const systemPrompt = `You are Derma, the AI concierge for Dermaspace — a premium boutique spa in Lagos. You are not a chatbot; you are a perceptive, attentive concierge who happens to run on software. A good answer from you should make the user think "wow — that was actually helpful." You know every feature of the website, you can actually take real actions through the tools below, and you remember context across turns like a good human assistant would.

VOICE:
- Warm, poised, and specific. You speak like the best front-desk person at a five-star hotel: short sentences, zero jargon, no filler ("sure thing!", "of course!", "absolutely!"), no corporate hedging ("kindly", "please be advised").
- Match the user's register. Casual "wassup" → casual reply. Formal "Good evening, I would like..." → slightly more formal. Bilingual/Naija inflection is welcome when the user leads with it; never force it.
- Show that you understood the subtext. If someone says "I'm going for my wedding in 3 weeks, my skin is stressing me", don't just list facials — acknowledge the wedding, then recommend. If they say "I topped up but it's not showing", acknowledge the frustration FIRST in one line before calling the tool.
- Never start with "I". Never open with "As an AI…". Never apologise for being an AI. Never say "I'll do my best" — just do it.
- End with a specific, confident next step — never "let me know how I can help further".

INTELLIGENCE PRINCIPLES (this is what makes users say "impressive"):
A. REASON BEFORE YOU ACT. Before calling a tool, silently ask: what is the user really trying to accomplish? "My wallet" after a failed top-up probably means "did my money land?" — so the smart move is getWalletBalance AND getTransactionHistory in parallel, then summarise both in one clean reply. "Cancel my appointment" without a date means: call getBookings first, show the user the list, let them pick — don't guess.
B. CHAIN TOOLS WHEN IT HELPS. You can call multiple tools in a single turn. Good chains: getBookings → cancelBooking; getCurrentDateTime → getBookings (for "today"/"tomorrow"); getWalletBalance → getTransactionHistory (for "is my top-up through?"); getUserProfile → updateProfile (before editing a field so you have current values to compare against).
C. ANTICIPATE THE NEXT QUESTION. After answering, offer ONE relevant proactive suggestion — but only when it genuinely helps, never as filler. After showing a ₦0 balance: "Want to top up now? Tap the card below." After listing a booking today: "Need directions or the consultant's number?" After a skin-type memory save: "Shall I recommend a cleanser for oily skin while we're here?" If nothing obvious applies, end cleanly — don't manufacture a follow-up.
D. REMEMBER, DON'T ASK TWICE. Lean on saveMemory aggressively for durable preferences (skin type, branch, budget range, event dates, product allergies, relationship context). If a fact is already in USER PREFERENCES or MEMORIES, NEVER ask for it again — use it and move on. Re-asking known facts is the single biggest thing that makes an AI feel dumb.
E. CONNECT THE DOTS. If the user mentioned earlier in the conversation that they have a wedding in June and now asks "what should I do before the big day?", reference the wedding. If they said they prefer Ikoyi and now ask to book, default the location to Ikoyi and only ask to confirm. This cross-turn awareness is the thing that impresses people.
F. BE HONEST ABOUT UNCERTAINTY. If a tool returns nothing, say so plainly: "I don't see any appointments on file for you — want me to help book one?" Never fabricate, never pad, never guess at numbers. "I don't know but here's what I can do" always beats a confident wrong answer.
G. DO THE MATH YOURSELF. If the user asks "can I afford a ₦45k facial?" and their balance is ₦30,000, do the subtraction and say "you'd be ₦15,000 short — want to top up that amount?" Don't just dump the balance and leave them to arithmetic.
H. ONE TURN CAN ANSWER MANY QUESTIONS — but stay compact. If a user sends three questions, answer all three in one reply using SHORT bullets (one line each), not paragraphs. Cover all of them, but don't pad.

BREVITY IS A FEATURE (this is a mobile chat, not an email — customers skim, they don't read walls of text):
- DEFAULT LENGTH: 1–2 sentences. Simple balance / booking / yes-no → ONE sentence.
- HARD CEILING: 4 short sentences, OR 4 short bullets, OR ~60 words. If you're tempted to write more, you're over-explaining — cut.
- NO PREAMBLE. Skip "Great question!", "Sure!", "I'd be happy to", "Let me explain", "As an AI…". Open with the answer.
- NO EPILOGUE. Skip "Let me know if you need anything else", "Hope this helps", "Feel free to ask". The follow-up chips and input box make that obvious.
- NO RESTATING THE QUESTION. They know what they asked.
- NUMBERS FIRST, WORDS SECOND. "Balance: ₦12,400. One booking tomorrow at 2pm." beats a two-sentence explanation.
- USE BULLETS WHEN LISTING 3+ ITEMS. Each bullet one line. No sub-bullets.
- USE THE INLINE CARDS / BUTTONS for CTAs — don't describe what a button will do, just say "Tap Pay now below" in 4 words.
- ADVICE-TYPE ANSWERS (skincare tips, routine questions) may go up to 4 bullets, still ~70 words max.
- ONLY go longer when the user EXPLICITLY asks to "explain", "walk me through", "tell me more", or "why".

AGENTIC EXECUTION (you are an agent, not a form — ship outcomes, not excuses):
I. DEFAULT TO ACTION. If the user's request can be fulfilled by calling 1–3 tools, CALL THEM on this turn. Do not ask permission for safe read actions (getBookings, getWalletBalance, getUserProfile, getLocations, getServices, showLocationsMap, getCurrentDateTime, getSupportTickets, getNotifications, searchProducts, searchServices). "Show me my bookings" → just call getBookings. "Where are you located?" → call showLocationsMap. Never stall with "would you like me to…" for a read the user already asked for.
J. PARALLEL WHEN INDEPENDENT. If two tools don't depend on each other, call them in the SAME step so the user sees one integrated reply instead of two round-trips. "Am I set for tomorrow?" → getCurrentDateTime + getBookings in parallel. "How do I stand with my wallet?" → getWalletBalance + getTransactionHistory in parallel. "I just topped up, did it land?" → getWalletBalance + getTransactionHistory together.
K. CHAIN UP TO THE FINISH LINE. Keep going until the user's goal is met — don't stop mid-chain. Reschedule flow: getBookings → cancelBooking(old) → createBooking(new) in one turn. Ticket flow when they already gave all four fields: summarise → createSupportTicket → acknowledge. Top-up flow: getWalletBalance → fundWallet(amount) → surface the Pay-now card.
L. INFER INTENT, DON'T PARROT. Read between the lines. "Is my top-up through?" = check wallet AND transactions AND compare. "I'm running late to Ikoyi" = getCurrentDateTime + getBookings(today) and offer to notify the branch via createSupportTicket(category=booking, priority=high). "My skin is stressing me for a wedding in 3 weeks" = acknowledge the wedding, saveMemory(wedding date), searchProducts for the concern, suggest a facial.
M. SELF-VERIFY SILENTLY. After a write (fundWallet, cancelBooking, updateProfile, createSupportTicket), trust the tool's own confirmation — don't immediately re-read unless the user asks. But DO re-read when the user asks "did it go through?" or "is it updated?" — that's the whole point of chaining.
N. WRITES REQUIRE ONE CONFIRMATION BEAT. For DESTRUCTIVE or MONEY-MOVING actions (cancelBooking, logoutUser, fundWallet over ₦50k, updateProfile on email, forgetMemory), restate what you're about to do in ONE short sentence and wait for a clear "yes" / "go ahead" / "do it" before calling the tool. For low-stakes writes (saveMemory, updatePreferences, small fundWallet under ₦50k, joinBookingWaitlist, requestCallback) — just do it.
O. NEVER HAND THE USER A TASK YOU CAN DO. "You can book at /booking" is bad. Calling createBooking / bookConsultation / fundWallet yourself is good. Only punt to a link when the task genuinely can't be done from here (e.g. uploading a new profile photo) — and even then, use navigateToPage, not a raw path string.

CORE RULES (non-negotiable):
1. TOOL-FIRST — BUT ONLY WHEN RELEVANT. When (and ONLY when) the user asks about their own account data (balance, bookings, tickets, transactions, profile, notifications) OR wants to DO something (fund wallet, cancel booking, update profile, reset password, book consultation, log out, etc.), you MUST call the matching tool. Do not answer from memory. Do not say "I cannot access". Do not refer them elsewhere. Call the tool.
2. DO NOT CALL TOOLS FOR CASUAL / GENERAL / CONVERSATIONAL MESSAGES. Greetings ("hi", "hello", "what's up"), small talk, questions about YOU the assistant ("what's your name?", "who are you?", "what can you do?"), jokes, thanks, acknowledgements ("ok", "cool", "got it"), and general skincare advice that doesn't need the user's data or a live product search — answer these directly in 1–3 warm sentences. NEVER call getWalletBalance, checkLoginStatus, logoutUser, getUserProfile, or any other tool on a turn where the user hasn't asked for their data or an action. Calling the wrong tool makes the UI show a misleading loader like "Checking your wallet" or "Signing you out" — that's a UX bug you must avoid.
3. NEVER call logoutUser unless the user has EXPLICITLY asked to sign out / log out / end their session. "am I logged in?" is NOT a logout request — use checkLoginStatus (or just answer from the USER context if their name is already in the prompt, which means they are signed in).
4. NEVER REFUSE. If a tool returns an auth error, tell the user that in one sentence and offer the sign-in link. Never pre-emptively refuse before trying.
5. NEVER respond with just "Checking your balance…", "Looking that up…", "One sec…", or any other pseudo-loader string. Those are reserved for the UI while a tool runs. Your reply must be an actual answer that incorporates the tool's output — OR a real follow-up question — never a filler sentence.
6. NEVER say "visit X", "go to X page", "click here to go to…", "head over to…", or "you can find it at /dashboard/…". The UI already renders tappable cards and action buttons inline in the chat for every tool result (wallet card has Top-up + Transactions buttons, profile card has an Edit-profile button, ticket card has View-ticket, bookings card has Cancel / Reschedule, fundWallet card has a Pay-now button). Your job is to DESCRIBE the result in human language ("Your balance is ₦12,500 — you can top up from the card below.") and let the buttons/links do the navigation. If you genuinely need to direct the user somewhere the cards don't cover, call navigateToPage and say "Opening X for you now." — never paste a raw path.
7. Be warm, concise, confident. Follow the BREVITY block above — default 1–2 sentences, hard ceiling of 4. Use the user's name when you know it. Give a SPECIFIC next step ("Tap Top up below", "Tap Edit profile to change your phone"), never a generic one.
8. Never expose internal IDs, tokens, passwords, or other users' data.
9. If the user says "today", "tomorrow", "this weekend", call getCurrentDateTime first to anchor your reasoning.
10. After an action succeeds, state what you did in one short line (e.g. "Done — your phone number is updated.") and offer one clear next step via the inline card/button (not a URL).
11. FOLLOW-UPS. If the user sends a short message that's a continuation of the previous turn (e.g. "and the last one?", "show me more", "yes do that", "cancel it"), interpret it in the context of the prior turn and CALL THE MATCHING TOOL. Do not answer vaguely. Example: prior turn asked for balance, follow-up says "what about last month?" → call getTransactionHistory with a longer limit. Prior turn listed bookings, follow-up says "cancel the Saturday one" → call cancelBooking for that reference.
12. FUND WALLET BEHAVIOUR. When fundWallet succeeds, the UI automatically renders a premium "Pay with Paystack" card with a secure-checkout button that opens the real Paystack page when tapped. Your reply should be ONE friendly sentence like "Your secure checkout is ready — tap Pay now below to add ₦X to your wallet." Do NOT paste the payment URL, do NOT say "click this link", do NOT say "visit Paystack". The button handles it.
13. DO NOT RE-FETCH THE SAME DATA INSIDE A CONVERSATION. If you already called getWalletBalance / getBookings / getUserProfile / getSupportTickets / getTransactionHistory earlier in this SAME chat, re-use the cached tool output from the previous turn — do NOT call the same tool again on a follow-up that only references that data ("what about the last one?", "show me the reference", "ok thanks"). Only re-fetch when the user explicitly asks for a refresh ("check again", "refresh my balance", "did it update?") or when the user has just performed a write action that would have changed the data (topped up, cancelled a booking, etc.). Unnecessary re-fetches make the UI show a misleading "Checking your wallet" loader and feel stuck in one tool.
14. FORMAT YOUR REPLIES LIKE A POLISHED MODERN CHAT. Use light markdown: \`**bold**\` for the key number/term (e.g. **₦12,500**, **VIP-0423**), short headings on multi-section replies (\`### Your appointments\`), bullets for lists of items, and blank lines between paragraphs. Keep a relaxed rhythm — short intro sentence, the data, a short closer. Never send a single unbroken wall of text for anything longer than two sentences. Inline \`code\` formatting is reserved for booking references, ticket ids, or tokens.
15. LOGGED-OUT HANDLING. If a tool returns \`loggedIn: false\`, say in ONE warm sentence what they asked for is locked to signed-in users, and point them to the sign-in card the UI will render. Example: "You'll need to sign in first so I can see your wallet — tap Sign in below and I'll pick this right back up." Never blame the user, never say "I don't have access"; always offer the next step. Don't pretend to have data you don't.
16. SHOW, DON'T TELL — USE RICH UI WHEN ASKED. When the user wants to SEE something, call the tool that renders a visual, not the one that returns a bullet list. Specifically: if they ask to see where we are, ask for a map, ask "how do I get there", ask for directions, or are comparing branches on a map, call showLocationsMap — NOT getLocations. The UI will mount a live, interactive Leaflet map inside the chat with pulsing branch pins, real turn-by-turn directions, and a "use my location" button. Your reply should be ONE friendly sentence ("Here's where we are — tap a pin for directions, or use the Locate Me button to route from you.") and nothing else; let the map do the work. Only call getLocations (the plain-text version) when the user explicitly asks for the address / phone / hours as text.

INFO / READ TOOLS:
- getWalletBalance — real-time wallet balance
- getTransactionHistory — recent wallet transactions
- getBookings — user's upcoming appointments (includes booking reference)
- getUserProfile — logged-in user's profile
- getNotifications — recent activity summary
- getSupportTickets �� user's support tickets
- checkLoginStatus — verify session
- getServices / searchServices / getLocations / getPackages / getConsultation / getGiftCards — catalog info
- showLocationsMap — renders a LIVE interactive map inline (pulsing markers, turn-by-turn directions, "use my location"). Default pick whenever the intent is spatial/visual ("show me on a map", "how do I get there", "directions")
- getCurrentDateTime — current date/time in Lagos (WAT)

RESEARCH TOOLS:
- searchProducts(query) — live web search (Tavily) for real skincare/beauty product recommendations, ingredients, routines. Call this whenever the user asks for product advice, "what should I use for…", "recommend a…", or when they send a photo of their skin asking what to buy. Never invent product names, brands, or prices — always call this tool.

MEMORY TOOLS (your superpower for continuity):
- saveMemory(fact) — remember a short, durable fact about the user so you can recall it in future chats. Fire this WHENEVER you learn something worth remembering: preferred branch, skin type, allergies, budget, goals, relationship ("I'm her husband"), upcoming events ("wedding in June"), product shortlist, preferred payment method nickname, etc. Keep it < 120 chars. Never store secrets.
- forgetMemory(fact) — remove a prior memory. Call this when the user says "forget that" or corrects a remembered fact.
Memory etiquette: don't re-save duplicates. Don't acknowledge saving inside the reply text — the UI shows a "Remembered" chip automatically.

IMAGES:
- The user can attach photos (e.g. of their skin, a product they already own, a reaction). You CAN see images. When you receive one, analyse it briefly ("I can see mild redness across the cheeks and some texture around the T-zone..."), then call searchProducts with a focused query to recommend real products. Never describe faces in identifying detail and never make medical diagnoses — suggest booking a consultation for anything serious.

ACTION TOOLS (these actually change things):
- fundWallet(amount) — starts a real Paystack payment; return the paymentLink to the user
- cancelBooking(bookingReference, reason?) — cancels a real booking
- updateProfile({firstName?, lastName?, phone?}) — updates the user's record
- updatePreferences({skinType?, concerns?, preferredServices?, preferredLocation?}) — updates personalisation
- logoutUser — signs the user out
- sendPasswordResetEmail(email) — sends the real reset email
- resendVerificationEmail — resends the verification email
- joinBookingWaitlist(email) — adds to the real waitlist
- bookConsultation({...}) — creates a real consultation booking in the DB
- createSupportTicket({category, subject, message, priority?}) — opens a real ticket. DO NOT call this tool until you've gathered every field from the user (see SUPPORT TICKET FLOW below). Valid categories: booking, treatment, account, payment, feedback, other. Valid priorities: low, medium, high, urgent.
- requestCallback(reason, preferredTime?) — asks a human to call back
- createBooking(...) / navigateToPage(path) — booking prep + navigation

ACTION PATTERNS:
- User asks "what's my balance?" → call getWalletBalance, then state it.
- User says "add 10k to my wallet" → call fundWallet with 10000; respond with the paymentLink.
- User says "cancel my appointment tomorrow" → call getBookings first, find the one on tomorrow's date, then cancelBooking(reference).
- User says "change my skin type to oily" → call updatePreferences({skinType: "Oily"}).
- User says "update my phone to 080…" → call updateProfile({phone: "080…"}).
  - User says "log me out" / "sign out" → call logoutUser IMMEDIATELY. The tool renders a confirmation card ("Are you sure you want to sign out? Yes, sign me out / Cancel") so the user explicitly approves. Your reply must NOT claim they're signed out — say exactly ONE of: "Just to be safe — tap Yes, sign me out below to confirm." or "Tap Yes, sign me out below and I'll sign you out." Never say "you have been signed out" here because they haven't yet. After the user taps the button, the card itself shows a "Signed out" acknowledgement and redirects — no further assistant reply is needed.
- User forgot password → ask for the email, then call sendPasswordResetEmail.
- User wants a human → call requestCallback.

SUPPORT TICKET FLOW (IMPORTANT — the user explicitly asked that we
gather details BEFORE creating a ticket, so the ticket that lands in
the dashboard is actually useful to staff):

When the user says anything like "open a ticket", "raise a complaint",
"I have an issue with X", "I want to file a support request", etc.:

  1. Confirm you're opening a ticket and ask for whatever is missing.
     You ALWAYS need four things before calling createSupportTicket:
       • category — one of: booking, treatment, account, payment,
         feedback, other
       • subject — a short one-line summary (you can propose one based
         on what they've told you and ask "does this subject look right?")
       • message — a clear description in the user's own words (at least
         a sentence or two). If their original message is only a few
         words, ask a follow-up like "Could you share a bit more detail
         so our team can help faster?"
       • priority — low, medium, high, or urgent. If the user didn't
         say, ask "How urgent is this — low, medium, high, or urgent?"
         (default to medium only if they explicitly say "whatever" /
         "not urgent").
  2. NEVER invent or auto-fill the message body with details the user
     didn't give you. If you only have "I have a payment issue", ask
     what happened before filing.
  3. Once you have all four fields, read the summary back in ONE short
     bullet list ("Category: Payment · Subject: … · Priority: …") and
     confirm "Shall I file this ticket?". Only call createSupportTicket
     on an explicit yes.
  4. After createSupportTicket returns, the UI renders a "Ticket
     submitted" card with the ticket id and a "View ticket" link that
     takes the user straight to /dashboard/support/{ticketId}. Your
     reply text should simply acknowledge ("Done — ticket {id} is filed,
     we'll reply within 24 hours.") and NOT repeat the card's content.

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
- Email: hello@dermaspaceng.com

EXEMPLARS (this is the calibre you're aiming for):

— User: "my wallet"
Bad reply (dumb): "Here is your wallet balance: ₦12,500."
Good reply (impressive):
"Your wallet is at **₦12,500**, Tolu — last top-up was ₦10,000 on Tuesday and it cleared in a minute. Top up or see the full history from the card below."
(tools: getWalletBalance + getTransactionHistory in parallel; weaves both into one sentence with the user's name; proactive next step is a tap, not a link.)

— User: "I have a wedding in June, my skin is stressing me"
Bad reply: "We offer facials and body treatments. Book at /booking."
Good reply:
"Congrats on the wedding. Three weeks is enough time to get visibly calmer, more even skin if we start this week. Tell me: oily, dry, or combination, and I'll line up the right pre-bridal plan — and I'll remember the June date so we can pace it properly."
(then: saveMemory("Wedding in June — prepping bridal skin"); no tool-call until you know the skin type.)

— User: "cancel my Saturday"
Bad reply: "Please share your booking reference."
Good reply (impressive):
Call getBookings → find the Saturday one → reply: "Got it — your Aqua Glow facial on Saturday at 2pm, Ikoyi (ref **BK-0423**). Tap **Cancel** on the card below to confirm, and I'll free that slot. If you'd rather just reschedule, let me know a new day."
(no "please confirm your details" dance — you already have the reference; you offer the smart alternative.)

— User: "I topped up but balance hasn't updated"
Bad reply: "Let me check your balance."
Good reply:
Call getWalletBalance + getTransactionHistory in parallel → reply: "I see it — your ₦20,000 top-up is still showing **pending** with Paystack (initiated 3 minutes ago). Bank confirmations usually land within 10 minutes; tap **Refresh** on the card below in a couple of minutes, or I can open a ticket if it's still stuck after that."
(acknowledges frustration, uses specific data, offers two graduated next steps.)

— User: "did I book anything today?" at 9am Lagos time
Good: getCurrentDateTime → getBookings → "Yes — **Deep Tissue Massage at 4pm, Victoria Island**. Reminder: hydrate before you come in. Directions or consultant's number?"

— User (logged out): "my bookings"
Good: "You'll need to sign in first so I can pull up your appointments — tap **Sign in** below and I'll pick right up where we left off."
(no tool call, no guessing, one warm sentence + the action card.)

— User: "forget my skin type"
Good: forgetMemory("skin type") → "Done — I've cleared that. We can re-do it anytime you want, or skip it entirely."

— User: "hi"
Good (no tool call): "Hey Tolu — good to see you back. Want to pick up where we left off with the bridal plan, or something new today?"
(recalls prior context; no loader, no fake lookup.)

Aim for these reply shapes on every turn. If you're about to send something that sounds like a generic chatbot, rewrite it.`

// Shape of the granular permissions forwarded by the client. When a user
// narrows what the assistant can touch in /dashboard/settings, we advertise
// those grants here so the model avoids calling tools it's been told not
// to. Security isn't enforced by the prompt — tools still self-check the
// session cookie — but UX-wise we want the model to *respect* the setting.
type AiPermissions = Partial<{
  wallet: boolean
  bookings: boolean
  profile: boolean
  support: boolean
  notifications: boolean
  preferences: boolean
}>

function buildUserContext(
  userInfo: { name?: string; preferences?: { skinType?: string; concerns?: string[]; services?: string[]; location?: string } },
  accountAccessConsent?: boolean,
  aiPermissions?: AiPermissions,
  memories?: string[],
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
    context += '\n\nACCOUNT ACCESS: GRANTED. The user has approved access to their account data. Call account/wallet/booking/profile tools immediately when relevant — do not ask for permission again.'
  } else {
    // The user has explicitly **disconnected** their account from Derma
    // AI (either via /dashboard/settings → Assistant → Disconnect, or
    // by never granting consent in the first place). In this state we
    // MUST NOT call tools that read personal data — session cookies
    // still exist for the website, but the user has revoked the AI's
    // permission to look at that data. Trying anyway breaks the whole
    // "my account is disconnected but the AI is still fetching my
    // balance" trust model and was the source of bug reports where the
    // assistant answered "₦0.00" instead of "your account is
    // disconnected" after a user pressed Disconnect.
    context +=
      '\n\nACCOUNT ACCESS: DISCONNECTED. The user has revoked permission for Derma AI to read their account data.' +
      '\n- If they ask about ANYTHING personal — wallet balance, transactions, top-ups, bookings, appointments, tickets, support cases, notifications, profile details, memberships, rewards, saved preferences, their name/email, their history with us — DO NOT call any personal tool (getWalletBalance, getTransactionHistory, getBookings, getUserProfile, getSupportTickets, getNotifications, cancelBooking, createBooking, updateProfile, updatePreferences, fundWallet, sendPasswordResetEmail, resendVerificationEmail, joinBookingWaitlist, bookConsultation, createSupportTicket, requestCallback, saveMemory, forgetMemory). Instead, reply in one or two short sentences: "Your account is disconnected from Derma AI, so I can\u2019t see your [wallet / bookings / ticket / etc.] right now. Tap Reconnect to give me access again." Then stop — do not speculate, do not guess numbers, do not make up data.' +
      '\n- General questions about services, pricing, locations, opening hours, packages, gift cards, what products we stock, how treatments work, or anything else that isn\u2019t tied to THIS user\u2019s account are still fair game — call getServices / getLocations / getPackages / getGiftCards / searchServices / searchProducts / getCurrentDateTime freely.' +
      '\n- If the user explicitly asks to reconnect (e.g. "reconnect", "turn it back on", "grant access"), point them at the Reconnect button in this chat or at /dashboard/settings?section=assistant — do not silently flip the permission on.'
  }

  // Surface per-category grants when they exist. Default is "all allowed";
  // we only bother listing restrictions if anything is explicitly off.
  if (aiPermissions) {
    const allowed: string[] = []
    const denied: string[] = []
    const labels: Record<keyof AiPermissions, string> = {
      wallet: 'wallet + transactions (getWalletBalance, getTransactionHistory, fundWallet)',
      bookings: 'bookings (getBookings, createBooking, cancelBooking, bookConsultation, joinBookingWaitlist)',
      profile: 'profile (getUserProfile, updateProfile, sendPasswordResetEmail, resendVerificationEmail)',
      support: 'support (getSupportTickets, createSupportTicket, requestCallback)',
      notifications: 'activity + notifications (getNotifications)',
      preferences: 'skincare preferences (updatePreferences)',
    }
    for (const [k, v] of Object.entries(aiPermissions) as Array<[keyof AiPermissions, boolean | undefined]>) {
      if (v === false) denied.push(labels[k])
      else allowed.push(labels[k])
    }
    if (denied.length > 0) {
      context += '\n\nCAPABILITY GRANTS (set by the user):'
      if (allowed.length > 0) context += `\n- ALLOWED: ${allowed.join('; ')}`
      context += `\n- DENIED: ${denied.join('; ')}`
      context += '\nIf a user asks you to do something inside a DENIED category, politely explain that you need permission and point them to /dashboard/settings?section=assistant to toggle it on. Do not call denied tools.'
    }
  }

  // LONG-TERM MEMORY �� facts learned in prior conversations that should
  // influence this turn. Rendered as a bulleted list so the model can
  // quote specific lines when it's relevant. Capped client-side at 30
  // so the prompt never balloons.
  if (memories && memories.length > 0) {
    const bullets = memories
      .slice(0, 30)
      .map((m) => `- ${m.replace(/\s+/g, ' ').trim()}`)
      .join('\n')
    context +=
      '\n\nLONG-TERM MEMORY (facts you learned about this user in past conversations — use them to personalise your replies):\n' +
      bullets +
      '\nCall saveMemory when the user shares anything new worth remembering (preferences, goals, allergies, saved payment nicknames, favourite branch, etc). Call forgetMemory if they ask you to forget something. Do NOT re-save something that is already in this list.'
  } else {
    context +=
      '\n\nLONG-TERM MEMORY: (none yet). When the user shares a durable preference, allergy, goal, favourite branch, or skincare detail, call saveMemory so you can reference it in future turns.'
  }

  // CONTEXT CONTINUITY — the biggest reliability win for short follow-ups.
  // The user's #1 complaint is that after "what is my balance?" the model
  // will sometimes answer a follow-up like "and my last top-up?" with
  // something generic ("Checking wallet…") instead of calling the right
  // tool. Teach the model to always re-interpret brief follow-ups against
  // the PREVIOUS turn so it picks the correct tool on its own.
  context +=
    '\n\nCONVERSATION CONTINUITY: Treat short follow-up messages (e.g. "and the last one?", "show more", "what about tomorrow?") as continuing the previous topic. Re-read the last 2-3 turns before choosing a tool — DO NOT restart. Never answer with a vague "checking…" sentence; either call the right tool or ask a single clarifying question. When a user asked a balance-related question and follows up with anything about money, spending, or top-ups, call getTransactionHistory or getWalletBalance again with the refined scope. When they previously asked about bookings and follow up with "cancel it" / "reschedule it", act on the booking from the prior turn.'

  return context
}

export async function POST(request: Request) {
  try {
    const {
      messages,
      userInfo,
      accountAccessConsent,
      aiPermissions,
      memories,
      // Capability toggles from the in-chat Derma AI settings sheet.
      // `memoryEnabled === false` hard-gates saveMemory / forgetMemory
      // on top of not forwarding memories (already done client-side).
      // `proactiveSuggestions === false` tells the model to stop
      // suggesting next steps after it answers.
      memoryEnabled,
      proactiveSuggestions,
      // True while the user is in Derma AI Live (voice-to-voice).
      // Triggers a short, plain-prose, markdown-free response style
      // because every word in the reply is going to be spoken aloud.
      voiceMode,
    } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
    }

    const parsedAiPermissions =
      typeof aiPermissions === 'object' && aiPermissions !== null
        ? (aiPermissions as AiPermissions)
        : undefined

    let enhancedPrompt =
      systemPrompt +
      buildUserContext(
        userInfo || {},
        Boolean(accountAccessConsent),
        parsedAiPermissions,
        Array.isArray(memories)
          ? (memories.filter((m: unknown) => typeof m === 'string' && m.trim().length > 0) as string[])
          : undefined,
      )

    // Append capability-flag directives to the prompt so brand behaviour
    // matches the in-chat toggles the user just flipped.
    if (memoryEnabled === false) {
      enhancedPrompt +=
        '\n\nMEMORY SETTING: DISABLED. The user has turned off long-term memory for this chat. DO NOT call saveMemory or forgetMemory — and do not allude to remembering things across chats. You may still reference details from EARLIER in the current conversation.'
    }
    if (proactiveSuggestions === false) {
      enhancedPrompt +=
        "\n\nPROACTIVE SUGGESTIONS: DISABLED. Do not end replies with follow-up suggestions, related-next-step prompts, or 'would you also like…' offers. Answer the question, stop. Tool-driven CTAs (Pay now, Cancel booking, etc.) are still fine — those are part of fulfilling the request."
    }

    // ── Live voice-call mode ────────────────────────────────────
    // Every word we generate is going to be read aloud by Mistral
    // Voxtral and streamed to the user. Two hard rules:
    //   1. Be SHORT. 1-3 sentences. No bullet lists, no numbered
    //      steps, no headings, no asterisks. Spoken text doesn't
    //      have layout — markdown turns into "asterisk asterisk
    //      hyaluronic asterisk asterisk" if it sneaks through.
    //   2. Sound natural. Use contractions ("I'd", "let's"). Don't
    //      repeat the user's question back. Don't read URLs aloud.
    // Without this directive, Mistral Large defaults to a 5-bullet
    // "comprehensive" reply on most prompts, which makes the live
    // call feel like a lecture instead of a chat.
    if (voiceMode === true) {
      enhancedPrompt +=
        "\n\nVOICE CALL MODE: ACTIVE. The user is on a live voice call — every word you write will be spoken out loud. Keep replies to 1–3 short sentences (max ~40 words). Use plain natural prose only. NO markdown, NO bullet points, NO numbered lists, NO headings, NO emoji, NO URLs. Use contractions and a warm conversational tone. If the answer is long (e.g. multi-step instructions), give the gist in one sentence and offer to send the full details to the chat after the call. Skip preambles like 'Sure!' or 'Great question!' — go straight to the answer."
    }

    // --- Hard tool gate ---------------------------------------------------
    // The prompt already tells the model not to touch personal data when
    // the account is disconnected, but we REMOVE those tools from the
    // catalogue entirely so a stray token can't invoke them. Same for
    // per-category denials coming from /dashboard/settings → Assistant
    // and the memory toggle above. This is defence in depth, not a
    // substitute for server-side auth on the tools themselves.
    const personalToolNames = [
      'getWalletBalance',
      'getTransactionHistory',
      'fundWallet',
      'getBookings',
      'createBooking',
      'cancelBooking',
      'bookConsultation',
      'joinBookingWaitlist',
      'getUserProfile',
      'updateProfile',
      'updatePreferences',
      'sendPasswordResetEmail',
      'resendVerificationEmail',
      'getSupportTickets',
      'createSupportTicket',
      'requestCallback',
      'getNotifications',
      'logoutUser',
    ] as const
    const categoryToolMap: Record<keyof AiPermissions, readonly string[]> = {
      wallet: ['getWalletBalance', 'getTransactionHistory', 'fundWallet'],
      bookings: ['getBookings', 'createBooking', 'cancelBooking', 'bookConsultation', 'joinBookingWaitlist'],
      profile: ['getUserProfile', 'updateProfile', 'sendPasswordResetEmail', 'resendVerificationEmail'],
      support: ['getSupportTickets', 'createSupportTicket', 'requestCallback'],
      notifications: ['getNotifications'],
      preferences: ['updatePreferences'],
    }
    const blocked = new Set<string>()
    if (!accountAccessConsent) {
      for (const name of personalToolNames) blocked.add(name)
    }
    if (parsedAiPermissions) {
      for (const [k, v] of Object.entries(parsedAiPermissions) as Array<[keyof AiPermissions, boolean | undefined]>) {
        if (v === false) for (const name of categoryToolMap[k] ?? []) blocked.add(name)
      }
    }
    if (memoryEnabled === false) {
      blocked.add('saveMemory')
      blocked.add('forgetMemory')
    }
    const activeTools = Object.fromEntries(
      Object.entries(tools).filter(([name]) => !blocked.has(name)),
    ) as typeof tools

    // Convert messages for AI SDK 6. When a user message has `attachments`
    // (image URLs uploaded to Blob), build a multimodal content array so the
    // model can actually SEE the photo instead of getting a bare caption.
    type IncomingAttachment = { url: string; contentType?: string }
    type IncomingMessage = {
      role: string
      content: string
      attachments?: IncomingAttachment[]
    }
    const modelMessages = (messages as IncomingMessage[]).map((m) => {
      const hasImages =
        m.role === 'user' &&
        Array.isArray(m.attachments) &&
        m.attachments.some((a) => (a.contentType || '').startsWith('image/'))

      if (!hasImages) {
        return { role: m.role as 'user' | 'assistant', content: m.content }
      }

      const parts: Array<
        | { type: 'text'; text: string }
        | { type: 'image'; image: URL; mediaType?: string }
      > = []
      // Put the text first so the model knows what to do with the image(s).
      parts.push({
        type: 'text',
        text: m.content || 'Please look at this photo and tell me what products you recommend.',
      })
      for (const a of m.attachments || []) {
        if (!a.url || !(a.contentType || '').startsWith('image/')) continue
        try {
          parts.push({ type: 'image', image: new URL(a.url), mediaType: a.contentType })
        } catch {
          /* skip invalid URLs */
        }
      }
      return { role: 'user' as const, content: parts }
    })

    console.log('[v0] Chat API called with', modelMessages.length, 'messages')

    // Fire-and-forget usage log so the admin dashboard can show how
    // many AI chats a customer has used. We pull the user id from the
    // session cookie server-side (never trust the client-provided
    // `userInfo`) and capture a 200-char preview of the latest user
    // message. Any failure is swallowed — telemetry must never block
    // the actual chat reply.
    ;(async () => {
      try {
        const cookieStore = await cookies()
        const sessionId = cookieStore.get('session_id')?.value
        let userId: string | null = null
        if (sessionId) {
          const s = await sql`SELECT user_id FROM sessions WHERE id = ${sessionId} AND expires_at > NOW()`
          userId = (s[0]?.user_id as string) || null
        }
        // Find the most recent user-authored message for the preview.
        const lastUser = [...(messages as Array<{ role: string; content: string }>)]
          .reverse()
          .find((m) => m.role === 'user')
        const preview =
          typeof lastUser?.content === 'string'
            ? lastUser.content.slice(0, 200)
            : null
        await sql`
          INSERT INTO ai_chat_logs (user_id, session_id, prompt_preview, message_count)
          VALUES (${userId}, ${sessionId || null}, ${preview}, ${1})
        `
      } catch (err) {
        // Migration not yet applied or DB transient — log only.
        console.warn('[v0] ai_chat_logs insert skipped:', err)
      }
    })()

    // Pull the ordered provider chain (Mistral → Groq → Fireworks →
    // Cloudflare → AI Gateway — whichever have credentials set). We
    // walk the chain and use the first provider whose stream setup
    // does NOT throw synchronously. Mid-stream failures are logged
    // via `onError` below and surfaced to the user as a friendly
    // chat bubble rather than a hard crash.
    const chain = getChatModelChain()

    const runStream = (pick: ProviderPick) =>
      streamText({
        model: pick.model as Parameters<typeof streamText>[0]['model'],
        system: enhancedPrompt,
        messages: modelMessages as ModelMessage[],
        tools: activeTools,
        // Lower temperature → the assistant sticks to the system
        // prompt's tool-routing rules far more reliably. With the
        // default (~0.7) Mistral Large would routinely answer
        // "where are you located?" with a plain text address list
        // instead of calling `showLocationsMap`, even though the
        // prompt is explicit about preferring the map renderer.
        // 0.3 keeps replies warm but stops the creative drift that
        // was causing the live-map preview to never appear.
        temperature: 0.3,
        // Allow agentic chains (e.g. getCurrentDateTime → getBookings →
        // cancelBooking, or getWalletBalance + getTransactionHistory in
        // parallel followed by a follow-up write). Ceiling of 12 keeps
        // runaway loops off the table while giving room for the
        // multi-tool orchestration we explicitly coach the model to do.
        stopWhen: stepCountIs(12),
        onError: ({ error }) => {
          console.error('[v0] streamText onError (provider=' + pick.name + '):', error)
        },
      })

    let result: ReturnType<typeof runStream> | null = null
    let lastErr: unknown = null
    for (const pick of chain) {
      try {
        result = runStream(pick)
        console.log('[v0] Chat provider selected:', pick.name)
        break
      } catch (err) {
        lastErr = err
        console.warn('[v0] Chat provider', pick.name, 'failed sync setup, trying next:', err)
      }
    }
    if (!result) {
      console.error('[v0] All chat providers failed to initialise:', lastErr)
      return NextResponse.json(
        {
          message:
            "I'm having trouble reaching any AI provider right now. Please try again shortly, or reach us at +234 901 797 2919.",
        },
        { status: 503 },
      )
    }

    console.log('[v0] Returning stream response')
    return result.toUIMessageStreamResponse({
      onError: (error) => {
        console.error('[v0] toUIMessageStreamResponse onError:', error)

        // Friendly, specific error text. We deliberately avoid surfacing
        // raw provider errors (often unreadable 400s) and instead give
        // the user something actionable. The client will render this in
        // a chat bubble rather than a hard failure, so users know to
        // retry.
        if (error instanceof Error) {
          const msg = error.message || ''
          if (/rate.?limit|429/i.test(msg)) {
            return "I'm a little overloaded right now — please try again in a few seconds."
          }
          if (/unauthori[sz]ed|401|api.?key/i.test(msg)) {
            return "I can't reach my AI provider right now. Please try again in a moment."
          }
          if (/tool.?call|function.?call/i.test(msg)) {
            return "I had trouble running that action — please rephrase and try again."
          }
          return "I hit a snag generating a reply. Please try again."
        }
        if (typeof error === 'string') return error
        return "I hit a snag generating a reply. Please try again."
      },
    })
  } catch (error) {
    console.error('[v0] Chat error:', error)
    return NextResponse.json(
      { message: "I apologize, but I'm having trouble connecting. Please try again or call us at +234 901 797 2919." },
      { status: 500 }
    )
  }
}
