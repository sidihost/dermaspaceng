import { NextResponse } from 'next/server'
import { getPublicVapidKey, isPushConfigured } from '@/lib/push'

export async function GET() {
  return NextResponse.json({
    configured: isPushConfigured(),
    publicKey: getPublicVapidKey(),
  })
}
