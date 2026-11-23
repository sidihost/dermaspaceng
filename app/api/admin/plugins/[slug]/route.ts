// ---------------------------------------------------------------------------
// /api/admin/plugins/[slug]
//
//   PATCH  — toggle `enabled` or update plugin settings (`config`, `scriptUrl`,
//            `widgetLabel`, `widgetUrl`). Admin only + same-origin verified.
//   DELETE — uninstall a plugin completely. Admin only + same-origin verified.
// ---------------------------------------------------------------------------

import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { requireSameOrigin } from '@/lib/api-guard'
import {
  getCatalogPlugin,
  isSafeHref,
  isSafePublicHttpsUrl,
  validatePluginConfig,
  type InstalledPlugin,
} from '@/lib/plugins'
import { getInstalledPlugins, saveInstalledPlugins } from '@/lib/plugins-store'

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const csrf = requireSameOrigin(req)
  if (csrf) return csrf

  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { slug } = await context.params
  const current = await getInstalledPlugins(true)
  const idx = current.findIndex((p) => p.slug === slug)
  if (idx === -1) {
    return NextResponse.json({ error: 'Plugin is not installed.' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const existing = current[idx]
  let nextPlugin: InstalledPlugin = {
    ...existing,
    updatedAt: new Date().toISOString(),
  }

  if (typeof body.enabled === 'boolean') {
    nextPlugin.enabled = body.enabled
  }

  if (existing.isCustom) {
    if (typeof body.name === 'string') {
      const name = body.name.trim()
      if (name.length < 2 || name.length > 60) {
        return NextResponse.json(
          { error: 'Plugin name must be 2–60 characters.' },
          { status: 400 },
        )
      }
      nextPlugin.name = name
    }
    if (typeof body.description === 'string') {
      const desc = body.description.trim()
      if (desc.length < 6 || desc.length > 260) {
        return NextResponse.json(
          { error: 'Description must be 6–260 characters.' },
          { status: 400 },
        )
      }
      nextPlugin.description = desc
    }
    if (existing.kind === 'script' && typeof body.scriptUrl === 'string') {
      const url = body.scriptUrl.trim()
      if (!isSafePublicHttpsUrl(url)) {
        return NextResponse.json(
          { error: 'Script URL must be a valid public https:// URL.' },
          { status: 400 },
        )
      }
      nextPlugin.scriptUrl = url
    }
    if (existing.kind === 'widget') {
      if (typeof body.widgetLabel === 'string') {
        const label = body.widgetLabel.trim()
        if (label.length < 2 || label.length > 40) {
          return NextResponse.json(
            { error: 'Widget label must be 2–40 characters.' },
            { status: 400 },
          )
        }
        nextPlugin.widgetLabel = label
      }
      if (typeof body.widgetUrl === 'string') {
        const url = body.widgetUrl.trim()
        if (!isSafeHref(url)) {
          return NextResponse.json(
            { error: 'Widget destination must start with / or https://.' },
            { status: 400 },
          )
        }
        nextPlugin.widgetUrl = url
      }
    }
  } else if (body.config && typeof body.config === 'object') {
    const entry = getCatalogPlugin(existing.slug)
    if (!entry) {
      return NextResponse.json({ error: 'Catalog entry not found.' }, { status: 404 })
    }
    const validation = validatePluginConfig(
      entry,
      body.config as Record<string, unknown>,
      true,
    )
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    nextPlugin = {
      ...nextPlugin,
      config: validation.config,
    }
  }

  const nextList = [...current]
  nextList[idx] = nextPlugin
  const saved = await saveInstalledPlugins(nextList, admin.id)

  return NextResponse.json({ plugin: nextPlugin, installed: saved })
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const csrf = requireSameOrigin(req)
  if (csrf) return csrf

  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { slug } = await context.params
  const current = await getInstalledPlugins(true)
  const exists = current.some((p) => p.slug === slug)
  if (!exists) {
    return NextResponse.json({ error: 'Plugin is not installed.' }, { status: 404 })
  }

  const remaining = current.filter((p) => p.slug !== slug)
  const saved = await saveInstalledPlugins(remaining, admin.id)
  return NextResponse.json({ success: true, installed: saved })
}
