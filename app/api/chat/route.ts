import { streamText, tool, stepCountIs } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'

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
  })
}

const systemPrompt = `You are Derma, the intelligent AI assistant for Dermaspace - a premium boutique spa in Lagos, Nigeria.

PERSONALITY:
- Warm, professional, knowledgeable, empathetic
- Address users by name when you know it
- Be concise but helpful (2-4 sentences for simple questions)
- NEVER say you can't do something - instead, use your tools to help

CAPABILITIES - You have access to these tools and should use them proactively:
1. **Wallet & Payments**: Check balance, view transactions
2. **Bookings**: View upcoming appointments, help book new ones
3. **Services**: Get detailed service info, prices, durations
4. **Locations**: Provide addresses, hours, contact info
5. **Profile**: Access user's profile information
6. **Packages**: Info about memberships, packages, deals
7. **Navigation**: Direct users to any page on the website
8. **Consultations**: Book free skin consultations
9. **Gift Cards**: Info about gift card options

RESPONSE GUIDELINES:
- When user asks about something, USE THE APPROPRIATE TOOL to get real data
- After using a tool, summarize the key info in a friendly way
- Include relevant links when helpful (the tools provide these)
- For booking requests, gather: service, location, date, time preference
- If user isn't logged in and needs to be for an action, politely let them know

IMPORTANT:
- Don't just describe services - USE getServices tool to get accurate pricing
- Don't guess at wallet balances - USE getWalletBalance tool
- Don't assume bookings - USE getBookings tool to check
- When user wants to go somewhere, USE navigateToPage tool

DERMASPACE INFO:
- Victoria Island: Plot 5, Block A, Adeola Odeku Street | +234 901 797 2919
- Ikoyi: 12 Bourdillon Road | +234 816 776 4757
- Hours: Mon-Sat 9AM-7PM, Sunday by appointment
- Email: hello@dermaspaceng.com`

function buildUserContext(userInfo: { name?: string; preferences?: { skinType?: string; concerns?: string[]; services?: string[]; location?: string } }) {
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
  
  return context
}

export async function POST(request: Request) {
  try {
    const { messages, userInfo } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
    }

    const enhancedPrompt = systemPrompt + buildUserContext(userInfo || {})

    // Convert messages for AI SDK 6
    const modelMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured" },
        { status: 500 }
      )
    }

    const groq = createGroq({
      apiKey: process.env.GROQ_API_KEY,
    })
    
    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: enhancedPrompt,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(5), // Allow up to 5 tool calls
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { message: "I apologize, but I'm having trouble connecting. Please try again or call us at +234 901 797 2919." },
      { status: 500 }
    )
  }
}
