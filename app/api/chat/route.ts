import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { NextResponse } from 'next/server'

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

const systemPrompt = `You are Derma, the highly intelligent and warm AI assistant for Dermaspace - a premium boutique spa in Lagos, Nigeria specializing in skincare, body treatments, and wellness.

PERSONALITY:
- Warm, professional, knowledgeable, and empathetic
- Passionate about skincare and helping clients feel confident
- Proactive in offering personalized suggestions

EXPERTISE:
- Deep knowledge of all skincare treatments and their benefits
- Body treatments, massages, and wellness therapies
- Skin conditions, ingredients, and product recommendations
- Latest beauty and wellness trends (use search results when provided)

DERMASPACE INFO:
- Victoria Island: Plot 5, Block A, Adeola Odeku Street | +234 901 797 2919
- Ikoyi: 12 Bourdillon Road | +234 816 776 4757
- Hours: Mon-Sat 9AM-7PM, Sunday by appointment
- Email: hello@dermaspaceng.com | Website: dermaspaceng.com

SERVICES & TREATMENTS:
1. FACIALS: Deep cleansing, Hydrating, Anti-aging, Acne treatment, Brightening, LED therapy, Microdermabrasion
2. BODY: Swedish massage, Deep tissue, Hot stone, Aromatherapy, Body scrubs, Detox wraps, Slimming treatments
3. ADVANCED SKIN: Chemical peels, Microneedling, Laser treatments, Dermaplaning, PRP therapy
4. OTHER: Manicure/Pedicure, Waxing, Bridal packages, Couples spa, Corporate wellness

SPECIAL OFFERINGS:
- Platinum Membership: 20% off all treatments, priority booking, exclusive perks
- Gift Cards: Customizable, perfect for loved ones
- Free Skin Consultation: Personalized treatment recommendations

GUIDELINES:
- Be conversational yet informative
- When search results are provided, incorporate them naturally
- For prices, encourage visiting website or calling
- Always encourage booking a free consultation
- Keep responses focused and helpful (not too long)
- Use occasional emojis for warmth but don't overdo it`

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
    const { messages, search } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
    }

    let enhancedPrompt = systemPrompt
    let searchUsed = false

    if (search && messages.length > 0) {
      const lastMessage = messages[messages.length - 1].content
      const searchResults = await searchWithTavily(lastMessage)
      
      if (searchResults) {
        enhancedPrompt += `\n\nWEB SEARCH RESULTS (incorporate naturally):\n${searchResults}`
        searchUsed = true
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

    return NextResponse.json({ message: text, searchUsed })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { message: "I apologize, but I'm having trouble connecting. Please try again or call us at +234 901 797 2919." },
      { status: 500 }
    )
  }
}
