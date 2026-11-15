import { NextRequest, NextResponse } from 'next/server'
import { getPublicVapidKey, isPushConfigured } from '@/lib/push'
import {
  isPreviewDeploymentEnv,
  isPreviewRequestHost,
  isServiceWorkerAllowedOrigin,
} from '@/lib/push-origin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')
  const forwardedHost = request.headers.get('x-forwarded-host')
  const effectiveHost = forwardedHost?.split(',')[0]?.trim() || host

  const allowLocalhost = !isPreviewDeploymentEnv()
  const canonicalOptions = {
    configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    allowLocalhost,
  }

  const blockedByEnv = isPreviewDeploymentEnv()
  const blockedByPreviewHost = isPreviewRequestHost({
    origin,
    referer,
    host,
    forwardedHost,
  })
  const blockedByNonCanonicalHost =
    Boolean(effectiveHost) &&
    !isServiceWorkerAllowedOrigin(effectiveHost, canonicalOptions)

  if (blockedByEnv || blockedByPreviewHost || blockedByNonCanonicalHost) {
    return NextResponse.json({
      configured: false,
      publicKey: null,
      previewBlocked: true,
    })
  }

  return NextResponse.json({
    configured: isPushConfigured(),
    publicKey: getPublicVapidKey(),
    previewBlocked: false,
  })
}
