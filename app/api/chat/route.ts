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
      'Create a new support ticket for the logged-in user. Use when the user has a complaint, issue, question for staff, payment problem, or wants to file a formal request.',
    inputSchema: z.object({
      category: z
        .enum(['booking', 'payment', 'account', 'service', 'feedback', 'other'])
        .describe('The category of the issue'),
      subject: z.string().min(3).describe('Short subject line'),
      message: z.string().min(5).describe("Full description of the user's issue"),
      priority: z.enum(['low', 'medium', 'high']).nullable(),
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
          message: `Ticket ${ticketId} created. Our team will reply within 24 hours.`,
          supportLink: '/dashboard/support',
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

  // Log the user out
  logoutUser: tool({
    description:
      'Log the currently signed-in user out of Dermaspace. Use when the user says they want to sign out, log out, or end their session. Always confirm first before calling.',
    inputSchema: z.object({}),
    execute: async () => {
      const cookieStore = await cookies()
      const sessionId = cookieStore.get('session_id')?.value
      if (!sessionId) {
        return { success: true, alreadyLoggedOut: true, message: 'You are already signed out.' }
      }
      try {
        await sql`DELETE FROM sessions WHERE id = ${sessionId}`.catch(() => null)
        return {
          success: true,
          message: 'You have been signed out. Redirecting to the homepage.',
          link: '/',
          action: 'logout',
        }
      } catch (error) {
        console.error('[v0] logoutUser error:', error)
        return { success: false, message: 'Could not sign you out. Try the menu → Log out.' }
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

const systemPrompt = `You are Derma, the intelligent AI concierge for Dermaspace — a premium boutique spa in Lagos, Nigeria. You are an agent. You take real actions on the user's behalf using the tools below. You know every feature of the website and can actually do things — not just talk about them.

CORE RULES (non-negotiable):
1. TOOL-FIRST. Whenever the user asks about their own data (balance, bookings, tickets, transactions, profile, notifications) OR wants to do something (fund wallet, cancel booking, update profile, reset password, book consultation, log out, etc.), you MUST call the matching tool. Do not answer from memory. Do not say "I cannot access". Do not refer them elsewhere. Call the tool.
2. NEVER REFUSE. If a tool returns an auth error, tell the user that in one sentence and offer the sign-in link. Never pre-emptively refuse before trying.
3. Be warm, concise, confident. 2–4 sentences for simple answers. Use the user's name when you know it.
4. Never expose internal IDs, tokens, passwords, or other users' data.
5. If the user says "today", "tomorrow", "this weekend", call getCurrentDateTime first to anchor your reasoning.
6. After an action succeeds, state what you did in one short line (e.g. "Done — your phone number is updated.") and offer one clear next step.

INFO / READ TOOLS:
- getWalletBalance — real-time wallet balance
- getTransactionHistory — recent wallet transactions
- getBookings — user's upcoming appointments (includes booking reference)
- getUserProfile — logged-in user's profile
- getNotifications — recent activity summary
- getSupportTickets — user's support tickets
- checkLoginStatus — verify session
- getServices / searchServices / getLocations / getPackages / getConsultation / getGiftCards — catalog info
- getCurrentDateTime — current date/time in Lagos (WAT)

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
- createSupportTicket({category, subject, message, priority?}) — opens a real ticket
- requestCallback(reason, preferredTime?) — asks a human to call back
- createBooking(...) / navigateToPage(path) — booking prep + navigation

ACTION PATTERNS:
- User asks "what's my balance?" → call getWalletBalance, then state it.
- User says "add 10k to my wallet" → call fundWallet with 10000; respond with the paymentLink.
- User says "cancel my appointment tomorrow" → call getBookings first, find the one on tomorrow's date, then cancelBooking(reference).
- User says "change my skin type to oily" → call updatePreferences({skinType: "Oily"}).
- User says "update my phone to 080…" → call updateProfile({phone: "080…"}).
- User says "log me out" → confirm, then call logoutUser.
- User forgot password → ask for the email, then call sendPasswordResetEmail.
- User wants a human → call requestCallback.

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
    context += '\n\nACCOUNT ACCESS: GRANTED. The user has approved access to their account data. Call account/wallet/booking/profile tools immediately when relevant — do not ask for permission again.'
  } else {
    // Do NOT tell the model to refuse — the UI layer already gates the first
    // call with a consent modal, and session cookies enforce real security.
    // The model's job is to TRY the tool; auth failures are handled per-tool.
    context += '\n\nACCOUNT ACCESS: The user has an active session on the site. Always try the appropriate tool — each tool self-checks authentication and will return a friendly message if sign-in is required.'
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
      stopWhen: stepCountIs(8), // Allow agentic chains (e.g. getCurrentDateTime → getBookings → cancelBooking)
      temperature: 0.3, // Lower temperature = more reliable tool calling on llama-3.3
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
