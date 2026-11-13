import { normalizePublicOrigin } from './consultation-mode'

export function resolveEmailOrigin(override?: string | null): string {
  return normalizePublicOrigin(
    override ?? process.env.EMAIL_PUBLIC_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  )
}

export function buildEmailUrl(path: string, originOverride?: string | null): string {
  const origin = resolveEmailOrigin(originOverride)
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${origin}${cleanPath}`
}
