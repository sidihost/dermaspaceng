import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Images attached to chat messages live in Vercel Blob so the multimodal model
// (openai/gpt-5-mini) can read them by URL. We keep them public-read because
// OpenAI needs to fetch the URL server-to-server; a long random suffix makes
// the URL unguessable.
export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'])

export async function POST(req: Request) {
  try {
    // Require an authenticated session to prevent public abuse of our blob quota.
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value
    if (!sessionId) {
      return NextResponse.json({ error: 'Sign in to upload images.' }, { status: 401 })
    }

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported image type. Use JPG, PNG, WEBP or GIF.' },
        { status: 400 }
      )
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image too large (max 8 MB).' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const key = `derma-ai/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`

    const blob = await put(key, file, {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: false,
    })

    return NextResponse.json({
      url: blob.url,
      contentType: file.type,
      name: file.name,
      size: file.size,
    })
  } catch (err) {
    console.error('[v0] Chat upload error:', err)
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 })
  }
}
