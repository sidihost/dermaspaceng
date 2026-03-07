import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { NextResponse } from 'next/server'

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

const systemPrompt = `You are the friendly and helpful customer support assistant for Dermaspace, a premium boutique spa in Lagos, Nigeria. You help customers with information about services, booking appointments, packages, and general skincare advice.

Key information about Dermaspace:
- Locations: Victoria Island (237b Muri Okunola Street) and Ikoyi (44A, Awolowo Road)
- Hours: Monday - Saturday, 9am - 7pm
- Phone: +234 901 797 2919 (VI) or +234 816 776 4757 (Ikoyi)
- Services: Body treatments, Facials, Massages, Manicure & Pedicure, Waxing, Laser treatments
- Special offerings: Platinum Membership with 20% discount, Gift Cards, Free Consultations

Guidelines:
- Be warm, professional, and helpful
- Keep responses concise (2-3 sentences when possible)
- Encourage booking consultations for personalized advice
- If asked about specific pricing, recommend they visit the website or call for current rates
- For medical concerns, recommend consulting with their skin specialist during a consultation
- Always be positive about Dermaspace's services and team`

export async function POST(request: Request) {
  try {
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
    }

    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
    })

    return NextResponse.json({ message: text })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}
