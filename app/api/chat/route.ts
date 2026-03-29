import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { NextResponse } from 'next/server'

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

const systemPrompt = `You are Derma, the intelligent and warm AI assistant for Dermaspace - a premium boutique spa in Lagos, Nigeria.

PERSONALITY: Warm, professional, knowledgeable, empathetic. You address users by their name when provided.

DERMASPACE INFO:
- Victoria Island: Plot 5, Block A, Adeola Odeku Street | +234 901 797 2919
- Ikoyi: 12 Bourdillon Road | +234 816 776 4757  
- Hours: Mon-Sat 9AM-7PM, Sunday by appointment
- Email: hello@dermaspaceng.com

WEBSITE PAGES (Direct users to these with action suggestions):
- /services - All services overview
- /services/facial-treatments - Facials: Deep cleansing, Hydrating, Anti-aging, Acne treatment, Brightening, LED therapy
- /services/body-treatments - Massages: Swedish, Deep tissue, Hot stone, Aromatherapy, Body scrubs, Detox wraps
- /services/nail-care - Manicures, Pedicures, Nail art
- /services/waxing - Full body waxing services
- /booking - Book appointments online
- /packages - View spa packages and memberships
- /gift-cards - Purchase gift cards
- /about - Our story and team
- /contact - Contact info and locations
- /gallery - Photo gallery of our spas
- /consultation - Book a free skin consultation

SERVICES:
1. FACIALS: Deep cleansing, Hydrating, Anti-aging, Acne treatment, Brightening, LED therapy, Microdermabrasion
2. BODY: Swedish massage, Deep tissue, Hot stone, Aromatherapy, Body scrubs, Detox wraps, Slimming
3. ADVANCED: Chemical peels, Microneedling, Laser, Dermaplaning, PRP therapy
4. NAIL: Classic/Gel manicure, pedicure, nail art
5. WAXING: Face, arms, legs, bikini, full body

RESPONSE FORMAT:
- Keep responses conversational and helpful (2-4 sentences max for simple questions)
- When mentioning a page, say "I can take you to [page name]" or "Check out our [page]"
- For user preferences, acknowledge them: "Based on your interest in [concern], I recommend..."
- Always be ready to help with booking

SPECIAL:
- Platinum Membership: 20% off, priority booking
- Gift Cards available
- Free Skin Consultations`

function buildUserContext(userInfo: { name?: string; preferences?: { skinType?: string; concerns?: string[]; services?: string[]; location?: string } }) {
  let context = ''
  
  if (userInfo.name) {
    context += `\n\nUSER INFO: The user's name is ${userInfo.name}. Address them by name occasionally to be personal.`
  }
  
  if (userInfo.preferences) {
    const prefs = userInfo.preferences
    context += '\n\nUSER PREFERENCES (use these to personalize recommendations):'
    if (prefs.skinType) context += `\n- Skin Type: ${prefs.skinType}`
    if (prefs.concerns?.length) context += `\n- Skin Concerns: ${prefs.concerns.join(', ')}`
    if (prefs.services?.length) context += `\n- Interested Services: ${prefs.services.join(', ')}`
    if (prefs.location) context += `\n- Preferred Location: ${prefs.location}`
    context += '\n\nUse this information to give personalized recommendations. For example, if they have acne concerns, suggest acne facials.'
  }
  
  return context
}

async function searchWithTavily(query: string): Promise<string | null> {
  if (!process.env.TAVILY_API_KEY) return null
  
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `${query} skincare beauty spa wellness treatment`,
        search_depth: 'basic',
        max_results: 3
      })
    })
    
    if (!response.ok) return null
    const data = await response.json()
    
    if (data.results?.length > 0) {
      return data.results
        .map((r: { title: string; content: string }) => `• ${r.title}: ${r.content}`)
        .join('\n')
    }
    return null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const { messages, search, userInfo } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
    }

    let enhancedPrompt = systemPrompt + buildUserContext(userInfo || {})

    if (search && messages.length > 0) {
      const lastMessage = messages[messages.length - 1].content
      const searchResults = await searchWithTavily(lastMessage)
      
      if (searchResults) {
        enhancedPrompt += `\n\nWEB SEARCH RESULTS:\n${searchResults}`
      }
    }

    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: enhancedPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
    })

    return NextResponse.json({ message: text })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { message: "I apologize, but I'm having trouble connecting. Please try again or call us at +234 901 797 2919." },
      { status: 500 }
    )
  }
}
