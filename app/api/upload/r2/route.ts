import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getCurrentUser } from '@/lib/auth'

const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

const SAFE_FOLDER_RE = /^[a-z0-9_-]{1,32}$/i
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
  try {
    // Check authentication - must be admin or staff
    const user = await getCurrentUser()
    if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const rawFolder = ((formData.get('folder') as string | null) ?? 'blog').trim()

    if (!SAFE_FOLDER_RE.test(rawFolder)) {
      return NextResponse.json(
        { error: 'Invalid upload folder name' },
        { status: 400 }
      )
    }
    const folder = rawFolder.toLowerCase()

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const ext = MIME_TO_EXT[file.type]
    if (!ext) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = crypto.randomBytes(12).toString('hex')
    const fileName = `${folder}/${timestamp}-${randomId}.${ext}`

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to R2
    await R2.send(
      new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
        // Cache for 1 year - images are immutable (new upload = new URL)
        CacheControl: 'public, max-age=31536000, immutable',
      })
    )

    // Build public URL
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL
      ? `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`
      : `https://${process.env.CLOUDFLARE_R2_BUCKET_NAME}.${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${fileName}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
    })
  } catch (error) {
    console.error('[R2 Upload Error]', error)
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    )
  }
}
