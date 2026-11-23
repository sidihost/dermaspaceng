// ---------------------------------------------------------------------------
// /api/plugins/active
//
// Public read-only endpoint returning ONLY enabled, sanitized public plugins
// for the client-side `PluginRuntime`. Secret / server-only fields (such as
// webhook URLs) are stripped by `toPublicActivePlugins`.
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server'
import { toPublicActivePlugins } from '@/lib/plugins'
import { getInstalledPlugins } from '@/lib/plugins-store'

export async function GET() {
  try {
    const installed = await getInstalledPlugins()
    const plugins = toPublicActivePlugins(installed)
    return NextResponse.json(
      { plugins },
      {
        headers: {
          'Cache-Control': 'public, max-age=15, stale-while-revalidate=60',
        },
      },
    )
  } catch {
    return NextResponse.json({ plugins: [] })
  }
}
