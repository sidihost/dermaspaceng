// ---------------------------------------------------------------------------
// /api/admin/plugins
//
//   GET  — returns the full built-in plugin catalogue plus all installed
//          plugins (built-in and custom). Admin only.
//   POST — installs either a built-in catalogue plugin (by `slug`) or a
//          custom plugin / uploaded JSON manifest (`mode: 'custom' | 'manifest'`).
//          Admin only + same-origin verified.
// ---------------------------------------------------------------------------

import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { requireSameOrigin } from '@/lib/api-guard'
import {
  PLUGIN_CATALOG,
  getCatalogPlugin,
  parsePluginManifestJson,
  validateCustomPluginInput,
  validatePluginConfig,
  type InstalledPlugin,
} from '@/lib/plugins'
import { getInstalledPlugins, saveInstalledPlugins } from '@/lib/plugins-store'

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const installed = await getInstalledPlugins(true)
  return NextResponse.json({
    catalog: PLUGIN_CATALOG,
    installed,
  })
}

export async function POST(req: NextRequest) {
  const csrf = requireSameOrigin(req)
  if (csrf) return csrf

  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const current = await getInstalledPlugins(true)
  const now = new Date().toISOString()

  // Mode 1: Install custom plugin via JSON manifest or manual form
  if (body.mode === 'manifest' || body.mode === 'custom') {
    const validated =
      body.mode === 'manifest'
        ? parsePluginManifestJson(typeof body.manifest === 'string' ? body.manifest : '')
        : validateCustomPluginInput(body.plugin ?? body)

    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }

    if (current.some((p) => p.slug === validated.plugin.slug)) {
      return NextResponse.json(
        { error: `Plugin "${validated.plugin.slug}" is already installed.` },
        { status: 409 },
      )
    }

    const nextPlugin: InstalledPlugin = {
      ...validated.plugin,
      installedAt: now,
      updatedAt: now,
    }

    const updated = await saveInstalledPlugins([nextPlugin, ...current], admin.id)
    return NextResponse.json({ plugin: nextPlugin, installed: updated }, { status: 201 })
  }

  // Mode 2: Install a built-in catalogue plugin by slug
  const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
  const entry = getCatalogPlugin(slug)
  if (!entry) {
    return NextResponse.json({ error: 'Unknown plugin slug.' }, { status: 404 })
  }

  if (current.some((p) => p.slug === entry.slug)) {
    return NextResponse.json(
      { error: `${entry.name} is already installed.` },
      { status: 409 },
    )
  }

  const rawConfig =
    body.config && typeof body.config === 'object'
      ? (body.config as Record<string, unknown>)
      : entry.defaultConfig

  const configResult = validatePluginConfig(entry, rawConfig, false)
  if (!configResult.ok) {
    return NextResponse.json({ error: configResult.error }, { status: 400 })
  }

  const nextPlugin: InstalledPlugin = {
    slug: entry.slug,
    name: entry.name,
    version: entry.version,
    author: entry.author,
    description: entry.description,
    category: entry.category,
    kind: entry.kind,
    iconKey: entry.iconKey,
    enabled: true,
    isCustom: false,
    scriptUrl: null,
    widgetLabel: null,
    widgetUrl: null,
    config: configResult.config,
    installedAt: now,
    updatedAt: now,
  }

  const updated = await saveInstalledPlugins([nextPlugin, ...current], admin.id)
  return NextResponse.json({ plugin: nextPlugin, installed: updated }, { status: 201 })
}
