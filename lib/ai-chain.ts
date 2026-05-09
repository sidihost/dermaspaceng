// Shared multi-provider AI chain for Dermaspace.
//
// The site used to hit the Vercel AI Gateway (`openai/gpt-5-mini` /
// `google/gemini-3-flash`) as a last-resort fallback. That gateway
// now rejects requests from free-tier teams with a 403 —
// "AI Gateway requires a valid credit card on file to service
// requests" — which was surfacing as a client-side crash whenever
// a chat message, tool call or Live vision poll was issued.
//
// To make the assistant resilient to ANY single provider outage
// (or billing lockout), this module centralises the provider
// selection logic and exposes two helpers:
//
//   • getChatModelChain() — ordered list of text models that
//     support tool calling, for streamText() in /api/chat.
//   • analyzeVisionFrame() — runs a single vision prompt against
//     the first provider that succeeds, for /api/live/analyze.
//
// Providers are picked purely on whether their API key env var is
// set, so operators can flip between Mistral / Fireworks / Cloudflare
// without touching code. The AI Gateway stays at the bottom as a
// "hope for the best" fallback, but the moment any other key is
// present we'll prefer it and the site keeps working on the free
// tiers of Mistral, Groq, Fireworks or Cloudflare Workers AI.
//
// Environment variables (all OPTIONAL — set any one and the site
// works; set several for automatic multi-provider failover):
//
//   MISTRAL_API_KEY         → Mistral (text + vision via Pixtral)
//   GROQ_API_KEY            → Groq    (text only, tool-calling)
//   FIREWORKS_API_KEY       → Fireworks AI (text + vision via Llama)
//   CLOUDFLARE_ACCOUNT_ID   ┐
//   CLOUDFLARE_API_TOKEN    ┘ → Cloudflare Workers AI (text + vision)
//   (falls back to the zero-config Vercel AI Gateway if none set)

import { createMistral } from '@ai-sdk/mistral'
import { createGroq } from '@ai-sdk/groq'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { generateText, type LanguageModel } from 'ai'

export type ProviderPick = {
  model: LanguageModel | string
  name: string
}

// ─── Helpers to lazy-construct each provider ──────────────────────
// We instantiate providers lazily inside these helpers (not at
// module load) so that adding an env var in Vercel and redeploying
// actually picks it up on the next request, even if the module has
// already been JIT-cached by an earlier request.

function pickMistralChat(): ProviderPick | null {
  if (!process.env.MISTRAL_API_KEY) return null
  const m = createMistral({ apiKey: process.env.MISTRAL_API_KEY })
  // `mistral-large-latest` has great tool-calling and is the
  // closest drop-in for the previous Groq/GPT choice.
  return { model: m('mistral-large-latest'), name: 'mistral' }
}

function pickMistralVision(): ProviderPick | null {
  if (!process.env.MISTRAL_API_KEY) return null
  const m = createMistral({ apiKey: process.env.MISTRAL_API_KEY })
  // We previously pinned `pixtral-12b-2409` — small, fast, but it
  // routinely missed real skin cues (redness, dryness, breakouts)
  // and hallucinated detail it couldn't see. Bumping to
  // `pixtral-large-latest` is Mistral's flagship multimodal model;
  // dramatically better accuracy on close-range face / skin frames
  // (which is what Derma AI Live polls every ~3s) at a tiny latency
  // cost. Still well under our 7s per-provider budget.
  return { model: m('pixtral-large-latest'), name: 'mistral-pixtral' }
}

function pickGroqChat(): ProviderPick | null {
  if (!process.env.GROQ_API_KEY) return null
  const g = createGroq({ apiKey: process.env.GROQ_API_KEY })
  // `openai/gpt-oss-120b` is the biggest tool-calling-capable model
  // Groq hosts; picked explicitly because the previous llama choice
  // silently dropped some tool calls on our 24-tool inventory.
  return { model: g('openai/gpt-oss-120b'), name: 'groq' }
}

function pickFireworksChat(): ProviderPick | null {
  if (!process.env.FIREWORKS_API_KEY) return null
  const f = createOpenAICompatible({
    name: 'fireworks',
    baseURL: 'https://api.fireworks.ai/inference/v1',
    headers: { Authorization: `Bearer ${process.env.FIREWORKS_API_KEY}` },
  })
  return {
    model: f('accounts/fireworks/ai/models/llama-v3p3-70b-instruct'),
    name: 'fireworks',
  }
}

function pickFireworksVision(): ProviderPick | null {
  if (!process.env.FIREWORKS_API_KEY) return null
  const f = createOpenAICompatible({
    name: 'fireworks',
    baseURL: 'https://api.fireworks.ai/inference/v1',
    headers: { Authorization: `Bearer ${process.env.FIREWORKS_API_KEY}` },
  })
  return {
    model: f('accounts/fireworks/ai/models/llama-v3p2-90b-vision-instruct'),
    name: 'fireworks-vision',
  }
}

function pickCloudflareChat(): ProviderPick | null {
  const acct = process.env.CLOUDFLARE_ACCOUNT_ID
  const tok = process.env.CLOUDFLARE_API_TOKEN
  if (!acct || !tok) return null
  const cf = createOpenAICompatible({
    name: 'cloudflare',
    baseURL: `https://api.cloudflare.com/client/v4/accounts/${acct}/ai/v1`,
    headers: { Authorization: `Bearer ${tok}` },
  })
  return {
    model: cf('@cf/meta/llama-3.3-70b-instruct-fp8-fast'),
    name: 'cloudflare',
  }
}

function pickCloudflareVision(): ProviderPick | null {
  const acct = process.env.CLOUDFLARE_ACCOUNT_ID
  const tok = process.env.CLOUDFLARE_API_TOKEN
  if (!acct || !tok) return null
  const cf = createOpenAICompatible({
    name: 'cloudflare',
    baseURL: `https://api.cloudflare.com/client/v4/accounts/${acct}/ai/v1`,
    headers: { Authorization: `Bearer ${tok}` },
  })
  return {
    model: cf('@cf/meta/llama-3.2-11b-vision-instruct'),
    name: 'cloudflare-vision',
  }
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Ordered chain of text/tool-calling models for the main chat.
 * Highest-priority provider that has credentials comes first; the
 * Vercel AI Gateway is always included as the final safety net.
 *
 * The caller should try them in order: if stream setup throws
 * synchronously (bad key, invalid model name), fall through to the
 * next entry. Failures that happen mid-stream cannot be recovered
 * from (the HTTP response has already started), so this is mainly
 * defensive against misconfiguration.
 *
 * 2026-04 ordering — Mistral first, Groq silent fallback.
 * --------------------------------------------------------
 * Per product call: keep Mistral Large as the default for ALL
 * customer-facing chat (highest quality tool-calling on our 24-tool
 * catalogue, fewer hallucinated booking IDs, better Nigerian-English
 * handling). Groq sits behind it as a *silent* fallback so when
 * Mistral rate-limits, 5xxs, or its key is misconfigured we degrade
 * to Groq's LPU inference without the user noticing — Groq is fast
 * enough to mask the swap. Fireworks / Cloudflare / AI Gateway then
 * provide defence-in-depth so the assistant is essentially never
 * unavailable as long as ONE provider is reachable.
 */
export function getChatModelChain(): ProviderPick[] {
  const chain: ProviderPick[] = []
  // 2026-04-27 reorder: Groq → Mistral.
  // -----------------------------------
  // Mistral was sitting at the top of the chain but its free tier
  // rate-limits at 1 req/sec/key and routinely returns empty
  // streams or 429s on bursty traffic — symptom: chat "loads then
  // shows error" because streamText emits no text-delta events
  // and the client falls through to the empty-content fallback.
  // Groq's LPU inference is far more reliable for casual greetings
  // and tool routing on a 24-tool catalogue, with sub-100ms TTFT,
  // so promote it to first position. Mistral stays as the second
  // option for when Groq's rate limit hits, and Fireworks /
  // Cloudflare / AI Gateway are defence-in-depth below that.
  const groq = pickGroqChat()
  if (groq) chain.push(groq)
  const mistral = pickMistralChat()
  if (mistral) chain.push(mistral)
  // Fireworks third — OpenAI-compat, good fallback for text.
  const fw = pickFireworksChat()
  if (fw) chain.push(fw)
  // Cloudflare fourth — free Workers AI tier, runs on their edge.
  const cf = pickCloudflareChat()
  if (cf) chain.push(cf)
  // Vercel AI Gateway — always last because it now requires a
  // credit card on the free team plan.
  chain.push({ model: 'openai/gpt-5-mini', name: 'vercel-gateway' })
  return chain
}

/**
 * Pre-flight ping for a chat provider. Returns true if the provider
 * answers a 1-token request inside `timeoutMs`, false otherwise.
 *
 * Why this exists
 * ----------------
 * `streamText()` doesn't throw synchronously when a provider's key
 * is missing, expired, rate-limited, or the upstream returns 5xx —
 * it returns the result object immediately and the failure surfaces
 * mid-stream, AFTER the HTTP response to the browser has already
 * begun. By that point we can't transparently fail over to another
 * provider, so the user sees an empty / errored reply.
 *
 * The fix is to ping the provider with a tiny `generateText` call
 * BEFORE we commit to it for the streaming response. This adds
 * ~150-400ms of latency but makes the chat endpoint essentially
 * immune to single-provider outages — the same approach the
 * AI Gateway, OpenAI, and Anthropic all use internally for their
 * upstream selection.
 *
 * Failures are swallowed here on purpose; the caller just looks at
 * the boolean. We also impose a tight per-provider deadline so a
 * slow provider can't stall the failover queue.
 */
export async function pingChatProvider(
  pick: ProviderPick,
  timeoutMs = 2500,
): Promise<boolean> {
  try {
    const ping = generateText({
      model: pick.model as LanguageModel,
      // A trivially-tokenisable user message that any chat model
      // will respond to with at least one token. Avoid system prompt
      // here — we want to test raw connectivity, not steerability.
      messages: [{ role: 'user', content: 'ping' }],
      // We only need to know the call succeeded; cap output so the
      // ping is cheap on rate-limited tiers.
      // (`maxOutputTokens` is the v6 name; v5 used `maxTokens`.)
      maxOutputTokens: 4,
      temperature: 0,
    })
    const timeout = new Promise<never>((_, rej) =>
      setTimeout(
        () => rej(new Error(`ping timeout (${timeoutMs}ms)`)),
        timeoutMs,
      ),
    )
    const { text } = (await Promise.race([ping, timeout])) as { text: string }
    if (typeof text === 'string') {
      // Empty text counts as "alive" — some providers return whitespace
      // for "ping" but the call itself succeeded, which is what we care
      // about. The actual chat request will use the real prompt.
      return true
    }
    return false
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(
      `[v0] Chat provider ${pick.name} ping failed:`,
      msg.slice(0, 200),
    )
    return false
  }
}

/**
 * Walk the chat chain and return the first provider whose ping
 * succeeds. Caller can then commit to it for streamText() with
 * confidence the upstream is alive. If every provider fails the
 * ping (network outage, all keys revoked, all upstreams down), we
 * still return the LAST entry in the chain so the caller can attempt
 * it anyway and surface a real error to the user instead of a
 * silent empty reply.
 */
export async function pickFirstHealthyChatProvider(
  chain: ProviderPick[],
  timeoutMs = 2500,
): Promise<{ pick: ProviderPick; healthy: boolean }> {
  for (const pick of chain) {
    const ok = await pingChatProvider(pick, timeoutMs)
    if (ok) {
      console.log(`[v0] Chat provider healthy: ${pick.name}`)
      return { pick, healthy: true }
    }
  }
  // Nothing answered — return the last entry so the caller can still
  // try it (and surface its real error) rather than crash.
  console.error('[v0] Every chat provider failed ping')
  return { pick: chain[chain.length - 1], healthy: false }
}

/**
 * One-shot vision analysis — tries every configured vision provider
 * in priority order until one returns text (or all fail). Used by
 * the Derma AI Live continuous-detection loop on ~3s cadence, so
 * each provider is given a tight timeout to prevent a slow
 * provider from stalling the queue.
 */
export async function analyzeVisionFrame(opts: {
  image: string // data URL, e.g. "data:image/jpeg;base64,…"
  system: string
  prompt: string
  temperature?: number
  /** Per-provider timeout in ms. Defaults to 8s. */
  timeoutMs?: number
}): Promise<{ text: string; provider: string }> {
  const timeoutMs = opts.timeoutMs ?? 8000
  const errors: string[] = []

  const candidates: (ProviderPick | null)[] = [
    pickMistralVision(),
    pickFireworksVision(),
    pickCloudflareVision(),
    // Vercel AI Gateway — Gemini 3 Flash is the zero-config vision
    // option, but requires a credit card now; kept last so we
    // actually use it only when nothing else is configured.
    { model: 'google/gemini-3-flash', name: 'vercel-gateway-gemini' },
  ]

  for (const pick of candidates) {
    if (!pick) continue
    try {
      // Race the generateText call against a per-provider timeout.
      // A hung provider would otherwise block the Live poll loop.
      const run = generateText({
        model: pick.model as LanguageModel,
        system: opts.system,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: opts.prompt },
              { type: 'image', image: opts.image },
            ],
          },
        ],
        temperature: opts.temperature ?? 0.35,
      })
      const timeout = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error('Provider timed out')), timeoutMs),
      )
      const { text } = await Promise.race([run, timeout]) as { text: string }
      const clean = (text || '').trim().replace(/^["']|["']$/g, '')
      if (clean) {
        return { text: clean, provider: pick.name }
      }
      errors.push(`${pick.name}: empty response`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Log enough detail to debug misconfig, but don't throw — we
      // want to give the next provider a chance.
      console.warn('[v0] Vision provider', pick.name, 'failed:', msg.slice(0, 240))
      errors.push(`${pick.name}: ${msg.slice(0, 120)}`)
    }
  }

  throw new Error(`All vision providers failed → ${errors.join(' | ')}`)
}
