import { NextResponse } from 'next/server'

// Kicks off the Microsoft OAuth 2.0 / OpenID Connect flow.
// We use the v2.0 endpoint with the "common" tenant by default so
// both personal Microsoft accounts and Azure AD work accounts can
// sign in. Set MICROSOFT_TENANT_ID to a specific tenant GUID (or
// "organizations" / "consumers") to restrict.
export async function GET() {
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const tenant = process.env.MICROSOFT_TENANT_ID || 'common'
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/microsoft/callback`

  if (!clientId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/signin?error=microsoft_not_configured`
    )
  }

  // openid + profile + email gives us the id_token claims; User.Read
  // lets us call Microsoft Graph /me for the canonical profile +
  // (best-effort) avatar. offline_access keeps a refresh token, mirroring
  // the Google flow even though we don't use it yet.
  const scope = encodeURIComponent('openid profile email User.Read offline_access')

  // response_mode=query keeps the callback a normal GET like Google's,
  // and prompt=select_account makes account switching obvious instead
  // of silently re-using whatever Microsoft session the browser has.
  const authUrl =
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize` +
    `?client_id=${clientId}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_mode=query` +
    `&scope=${scope}` +
    `&prompt=select_account`

  return NextResponse.redirect(authUrl)
}
