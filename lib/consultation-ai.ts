// AI-generated skin analysis for consultation requests.
//
// When a customer submits the consultation form we immediately run
// their concerns + notes through an LLM to produce a structured,
// personalised skin analysis and a set of recommendations. This gives
// the customer real value the moment they submit (and something to
// read on their tracking page) while our clinicians follow up.
//
// Resilience: we reuse the shared multi-provider chain from
// `lib/ai-chain` (Mistral → Groq → Fireworks → Cloudflare → Vercel
// Gateway). We walk the chain until one provider returns a valid
// object, so a single provider outage never breaks the flow. If every
// provider fails we return a safe, generic fallback so the submission
// still succeeds.

import { generateObject, type LanguageModel } from 'ai'
import { z } from 'zod'
import { getChatModelChain } from '@/lib/ai-chain'

// ─── Public shape stored in consultations.ai_analysis (jsonb) ──────
export const consultationAnalysisSchema = z.object({
  // One or two sentences summarising what the customer described and
  // what it suggests about their skin. Warm, plain English.
  summary: z
    .string()
    .describe(
      'A warm, 1-2 sentence overview of the customer’s described skin situation.',
    ),
  // Per-concern breakdown: what it usually means + why it happens.
  concerns: z
    .array(
      z.object({
        title: z.string().describe('The skin concern, e.g. "Acne & Breakouts".'),
        insight: z
          .string()
          .describe(
            'A clear, accurate 1-2 sentence explanation of likely causes and what to watch for. No diagnosis.',
          ),
      }),
    )
    .describe('One entry per concern the customer selected or described.'),
  // Recommended Dermaspace services / treatments to discuss.
  recommendations: z
    .array(
      z.object({
        title: z.string().describe('The recommended treatment or focus area.'),
        reason: z
          .string()
          .describe('Why this is recommended, tied to their concerns.'),
      }),
    )
    .describe('2-4 tailored, realistic treatment recommendations.'),
  // Simple at-home guidance while they wait for their appointment.
  routineTips: z
    .array(z.string())
    .describe('3-5 short, safe at-home skincare tips relevant to their concerns.'),
  // What happens next in plain terms.
  nextSteps: z
    .string()
    .describe(
      'A short, reassuring paragraph on what to expect at the in-clinic consultation.',
    ),
})

export type ConsultationAnalysis = z.infer<typeof consultationAnalysisSchema> & {
  disclaimer: string
  provider?: string
}

const DISCLAIMER =
  'This is an AI-generated preliminary overview based only on what you described. It is not a medical diagnosis. Your Dermaspace specialist will assess your skin in person and confirm the right plan for you.'

function buildFallback(concerns: string[]): ConsultationAnalysis {
  const list = concerns.length ? concerns : ['General Consultation']
  return {
    summary:
      'Thanks for sharing your skin concerns. Our team has received your request and will prepare a personalised plan for your visit.',
    concerns: list.map((c) => ({
      title: c,
      insight:
        'Your specialist will review this closely during your consultation and explain the likely causes and best options for your skin.',
    })),
    recommendations: [
      {
        title: 'In-clinic skin assessment',
        reason:
          'A hands-on assessment lets us tailor treatments precisely to your skin type and concerns.',
      },
    ],
    routineTips: [
      'Cleanse gently twice a day with a mild, fragrance-free cleanser.',
      'Apply a broad-spectrum SPF 30+ every morning.',
      'Avoid introducing multiple new products at once.',
      'Keep skin hydrated with a simple moisturiser.',
    ],
    nextSteps:
      'At your appointment, our specialist will examine your skin, discuss your goals, and build a personalised treatment plan.',
    disclaimer: DISCLAIMER,
    provider: 'fallback',
  }
}

const SYSTEM_PROMPT = `You are a senior dermatology consultant assistant for Dermaspace, a premium skincare and dermatology clinic in Lagos, Nigeria.

Your job: turn a customer's booking details into an accurate, genuinely helpful preliminary skin analysis. Be precise, evidence-based, and calm.

Hard rules:
- NEVER give a medical diagnosis, prescribe medication, or promise cures. Frame everything as likely/general guidance to confirm in person.
- Be specific to the concerns provided. Do NOT invent concerns the customer did not mention.
- Keep language warm, clear and free of jargon; explain any necessary term.
- Recommendations should reflect realistic professional skincare/dermatology services (e.g. chemical peels, hydrafacials, acne management, pigmentation treatments, laser, medical-grade skincare) — not specific drug brands or dosages.
- Tips must be safe for anyone and non-prescriptive.
- Consider Nigerian climate (hot, humid, high UV) and richly melanated skin (higher risk of post-inflammatory hyperpigmentation) where relevant.
- Be accurate. If information is thin, keep insights general rather than guessing specifics.`

export async function generateConsultationAnalysis(input: {
  firstName: string
  concerns: string[]
  notes?: string
  skinType?: string
}): Promise<ConsultationAnalysis> {
  const concerns = (input.concerns ?? []).filter(Boolean)
  const prompt = `Customer first name: ${input.firstName}
Selected concerns: ${concerns.length ? concerns.join(', ') : 'None selected (general consultation)'}
${input.skinType ? `Stated skin type: ${input.skinType}` : ''}
Additional notes from customer: ${input.notes?.trim() ? input.notes.trim() : 'None provided.'}

Produce a structured preliminary skin analysis tailored to the above.`

  const chain = getChatModelChain()
  const errors: string[] = []

  for (const pick of chain) {
    try {
      const { object } = await generateObject({
        model: pick.model as LanguageModel,
        schema: consultationAnalysisSchema,
        system: SYSTEM_PROMPT,
        prompt,
        temperature: 0.4,
        maxOutputTokens: 1200,
      })
      return { ...object, disclaimer: DISCLAIMER, provider: pick.name }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(
        `[v0] consultation analysis ${pick.name} failed:`,
        msg.slice(0, 200),
      )
      errors.push(`${pick.name}: ${msg.slice(0, 120)}`)
    }
  }

  console.error('[v0] All providers failed for consultation analysis:', errors.join(' | '))
  return buildFallback(concerns)
}
