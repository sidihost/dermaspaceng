import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getCurrentUser } from '@/lib/auth'

/**
 * Attachment upload endpoint for support tickets & consultations.
 *
 * Unlike /api/upload/r2 (admin-only, images-only, used by the blog editor)
 * this route accepts ANY authenticated user — customers need it to attach
 * screenshots/PDFs to their ticket and consultation replies — and allows
 * common image types plus PDF. Files land in Cloudflare R2 under support/.
 */

const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'support'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: images and PDF.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Sanitize the folder to a safe slug so callers can't traverse paths.
    const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, '').replace(/^\/+|\/+$/g, '') || 'support'

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 10)
    const fileName = `${safeFolder}/${timestamp}-${randomId}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    await R2.send(
      new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    )

    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL
      ? `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`
      : `https://${process.env.CLOUDFLARE_R2_BUCKET_NAME}.${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${fileName}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      name: file.name,
      type: file.type,
      size: file.size,
      fileName,
    })
  } catch (error) {
    console.error('[Attachment Upload Error]', error)
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    )
  }
}
