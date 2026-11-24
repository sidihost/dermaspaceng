'use client'

/**
 * /admin/addons/[slug] — Dedicated Plugin Configuration Page
 *
 * Full-page configuration experience (zero popups or modal dialogs) where
 * administrators configure built-in or custom plugins, toggle live status,
 * or safely uninstall a plugin with an inline Danger Zone confirmation.
 *
 * Design system compliance:
 *   - Brand purple #7B2D8E, crisp white surfaces, hairline gray-200 borders
 *   - Strictly flat: NO shadows, NO gradients
 *   - Strictly NO Sparkles or Zap icons
 *   - Strictly NO modals or popups
 */

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Download,
  Loader2,
  Lock,
  Trash2,
} from 'lucide-react'
import { useNotify } from '@/components/shared/notify'
import { PluginIconBadge } from '@/components/admin/plugin-icon'
import {
  getCatalogPlugin,
  type InstalledPlugin,
  type PluginCatalogEntry,
} from '@/lib/plugins'

type SinglePluginResponse = {
  plugin: InstalledPlugin | null
  catalogEntry: PluginCatalogEntry | null
}

const fetcher = async (url: string): Promise<SinglePluginResponse> => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    throw new Error(res.status === 404 ? 'not-found' : 'failed')
  }
  return res.json() as Promise<SinglePluginResponse>
}

export default function ConfigurePluginPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const notify = useNotify()
  const slug = typeof params?.slug === 'string' ? params.slug : ''

  const { data, isLoading, error, mutate } = useSWR<SinglePluginResponse>(
    slug ? `/api/admin/plugins/${encodeURIComponent(slug)}` : null,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )

  const plugin = data?.plugin ?? null
  const catalogEntry = data?.catalogEntry ?? (slug ? getCatalogPlugin(slug) ?? null : null)

  const [config, setConfig] = useState<Record<string, string>>({})
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [scriptUrl, setScriptUrl] = useState('')
  const [widgetLabel, setWidgetLabel] = useState('')
  const [widgetUrl, setWidgetUrl] = useState('')

  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [confirmUninstall, setConfirmUninstall] = useState(false)
  const [uninstalling, setUninstalling] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [savedBanner, setSavedBanner] = useState(false)

  useEffect(() => {
    if (!plugin && !catalogEntry) return
    setConfig({
      ...(catalogEntry?.defaultConfig ?? {}),
      ...(plugin?.config ?? {}),
    })
    setName(plugin?.name ?? catalogEntry?.name ?? '')
    setDescription(plugin?.description ?? catalogEntry?.description ?? '')
    setScriptUrl(plugin?.scriptUrl ?? '')
    setWidgetLabel(plugin?.widgetLabel ?? '')
    setWidgetUrl(plugin?.widgetUrl ?? '')
  }, [plugin, catalogEntry])

  const handleInstallFirst = async () => {
    if (!catalogEntry) return
    setInstalling(true)
    setFormError(null)
    try {
      const res = await fetch('/api/admin/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ slug: catalogEntry.slug }),
      })
      const payload = (await res.json()) as {
        plugin?: InstalledPlugin
        error?: string
      }
      if (!res.ok) {
        setFormError(payload.error || 'Could not install plugin.')
        return
      }
      await mutate()
      notify.success(`${catalogEntry.name} installed`, 'Configure settings below to activate.')
    } catch {
      setFormError('Network error while installing plugin.')
    } finally {
      setInstalling(false)
    }
  }

  const handleToggleEnabled = async () => {
    if (!plugin) return
    setToggling(true)
    setFormError(null)
    const nextEnabled = !plugin.enabled
    try {
      const res = await fetch(`/api/admin/plugins/${encodeURIComponent(plugin.slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled: nextEnabled }),
      })
      const payload = (await res.json()) as {
        plugin?: InstalledPlugin
        error?: string
      }
      if (!res.ok) {
        setFormError(payload.error || 'Could not update plugin status.')
        return
      }
      await mutate({ plugin: payload.plugin ?? { ...plugin, enabled: nextEnabled }, catalogEntry }, false)
      notify.success(
        nextEnabled ? `${plugin.name} enabled` : `${plugin.name} paused`,
        nextEnabled
          ? 'The plugin is now active across public pages.'
          : 'The plugin is paused until you re-enable it.',
      )
    } catch {
      setFormError('Network error while updating plugin status.')
    } finally {
      setToggling(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!plugin) return
    setFormError(null)
    setSavedBanner(false)
    setSaving(true)

    try {
      const body = plugin.isCustom
        ? {
            name,
            description,
            ...(plugin.kind === 'script'
              ? { scriptUrl }
              : { widgetLabel, widgetUrl }),
          }
        : { config }

      const res = await fetch(`/api/admin/plugins/${encodeURIComponent(plugin.slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const payload = (await res.json()) as {
        plugin?: InstalledPlugin
        error?: string
      }
      if (!res.ok) {
        setFormError(payload.error || 'Could not save configuration.')
        return
      }
      await mutate({ plugin: payload.plugin ?? plugin, catalogEntry }, false)
      setSavedBanner(true)
      notify.success('Configuration saved', `${plugin.name} settings have been updated.`)
    } catch {
      setFormError('Network error while saving configuration.')
    } finally {
      setSaving(false)
    }
  }

  const handleUninstall = async () => {
    if (!plugin) return
    setUninstalling(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/admin/plugins/${encodeURIComponent(plugin.slug)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const payload = (await res.json()) as { error?: string }
      if (!res.ok) {
        setFormError(payload.error || 'Could not uninstall plugin.')
        return
      }
      notify.info(`${plugin.name} uninstalled`, 'Removed from installed plugins.')
      router.push('/admin/addons')
      router.refresh()
    } catch {
      setFormError('Network error while uninstalling plugin.')
    } finally {
      setUninstalling(false)
    }
  }

  const displayName = plugin?.name ?? catalogEntry?.name ?? slug
  const displayVersion = plugin?.version ?? catalogEntry?.version ?? '1.0.0'
  const displayAuthor = plugin?.author ?? catalogEntry?.author ?? 'Dermaspace'
  const displayDescription = plugin?.description ?? catalogEntry?.description ?? ''
  const displayIconKey = plugin?.iconKey ?? catalogEntry?.iconKey

  return (
    <div className="max-w-3xl space-y-6">
      {/* ── Breadcrumb Back Navigation ─────────────────────────────── */}
      <div>
        <Link
          href="/admin/addons"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#7B2D8E] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
          Back to Plugins &amp; Add-ons
        </Link>
      </div>

      {isLoading && !data ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 flex items-center justify-center gap-2.5 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin text-[#7B2D8E]" />
          Loading plugin settings…
        </div>
      ) : error && !catalogEntry ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 space-y-4">
          <div className="flex items-center gap-2.5 text-red-700 text-sm font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Plugin not found</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            This plugin may have been uninstalled or the URL slug is invalid.
          </p>
          <Link
            href="/admin/addons"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] transition-colors"
          >
            Return to Plugins &amp; Add-ons
          </Link>
        </div>
      ) : (
        <>
          {/* ── Plugin Header Card ─────────────────────────────────── */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0">
                <PluginIconBadge
                  slug={slug}
                  iconKey={displayIconKey}
                  size="lg"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight">
                      {displayName}
                    </h1>
                    {plugin ? (
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          plugin.enabled
                            ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {plugin.enabled ? 'Active' : 'Paused'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        Not installed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    v{displayVersion} · by {displayAuthor}
                    {plugin?.isCustom && (
                      <span className="ml-1.5 text-[#7B2D8E] font-semibold">· Custom</span>
                    )}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mt-2">
                    {displayDescription}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {plugin ? (
                  <button
                    type="button"
                    disabled={toggling}
                    onClick={handleToggleEnabled}
                    aria-pressed={plugin.enabled}
                    className="inline-flex items-center gap-2.5 h-9 px-3.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-800 hover:border-[#7B2D8E]/40 disabled:opacity-50 transition-colors"
                  >
                    <span
                      className={`relative inline-flex w-8 h-4.5 rounded-full transition-colors ${
                        plugin.enabled ? 'bg-[#7B2D8E]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block w-3.5 h-3.5 rounded-full bg-white transition-transform mt-0.5 ${
                          plugin.enabled ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </span>
                    <span>{plugin.enabled ? 'Enabled' : 'Paused'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={installing}
                    onClick={handleInstallFirst}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] disabled:opacity-60 transition-colors"
                  >
                    {installing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" aria-hidden />
                    )}
                    Install Plugin
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* ── Configuration Form Section ─────────────────────────── */}
          {plugin ? (
            <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">
                  Plugin Configuration
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Saved settings take effect immediately across public Dermaspace pages.
                </p>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-5">
                {formError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {savedBanner && (
                  <div
                    role="status"
                    className="rounded-xl border border-[#7B2D8E]/25 bg-[#F8F2FB] px-4 py-3 text-xs text-[#7B2D8E] font-medium flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 flex-shrink-0" />
                    <span>Configuration saved and applied.</span>
                  </div>
                )}

                {plugin.isCustom ? (
                  <>
                    <div>
                      <label
                        htmlFor="custom-plugin-name"
                        className="block text-xs font-semibold text-gray-700 mb-1.5"
                      >
                        Plugin Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="custom-plugin-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="custom-plugin-description"
                        className="block text-xs font-semibold text-gray-700 mb-1.5"
                      >
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="custom-plugin-description"
                        rows={3}
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-3 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] outline-none resize-none"
                      />
                    </div>

                    {plugin.kind === 'script' ? (
                      <div>
                        <label
                          htmlFor="custom-plugin-script"
                          className="block text-xs font-semibold text-gray-700 mb-1.5"
                        >
                          Verified HTTPS Script URL <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="custom-plugin-script"
                          type="url"
                          required
                          value={scriptUrl}
                          onChange={(e) => setScriptUrl(e.target.value)}
                          placeholder="https://cdn.example.com/widget.js"
                          className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] outline-none"
                        />
                        <p className="text-[11px] text-gray-500 mt-1">
                          Only verified public https:// script endpoints are permitted.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor="custom-plugin-widget-label"
                            className="block text-xs font-semibold text-gray-700 mb-1.5"
                          >
                            Floating Button Label <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="custom-plugin-widget-label"
                            type="text"
                            required
                            value={widgetLabel}
                            onChange={(e) => setWidgetLabel(e.target.value)}
                            className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] outline-none"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="custom-plugin-widget-url"
                            className="block text-xs font-semibold text-gray-700 mb-1.5"
                          >
                            Destination Link (/path or https://...) <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="custom-plugin-widget-url"
                            type="text"
                            required
                            value={widgetUrl}
                            onChange={(e) => setWidgetUrl(e.target.value)}
                            className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  (catalogEntry?.fields ?? []).map((field) => (
                    <div key={field.key}>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <label
                          htmlFor={`field-${field.key}`}
                          className="text-xs font-semibold text-gray-700"
                        >
                          {field.label}
                          {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        {field.secret && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#7B2D8E] bg-[#F8F2FB] border border-[#7B2D8E]/20 px-2 py-0.5 rounded-full">
                            <Lock className="w-2.5 h-2.5" aria-hidden />
                            Server-only
                          </span>
                        )}
                      </div>
                      {field.type === 'textarea' ? (
                        <textarea
                          id={`field-${field.key}`}
                          rows={3}
                          required={field.required}
                          value={config[field.key] ?? ''}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          placeholder={field.placeholder}
                          className="w-full p-3 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] outline-none resize-none"
                        />
                      ) : (
                        <input
                          id={`field-${field.key}`}
                          type={field.type}
                          required={field.required}
                          value={config[field.key] ?? ''}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          placeholder={field.placeholder}
                          className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] outline-none"
                        />
                      )}
                      {field.help && (
                        <p className="text-[11px] text-gray-500 mt-1">{field.help}</p>
                      )}
                    </div>
                  ))
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
                  <Link
                    href="/admin/addons"
                    className="inline-flex items-center justify-center h-9 px-4 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Back to Plugins
                  </Link>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] disabled:opacity-60 transition-colors"
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" aria-hidden />
                    )}
                    Save Configuration
                  </button>
                </div>
              </form>
            </section>
          ) : (
            <section className="rounded-2xl border border-gray-200 bg-[#F8F7FA] p-6 space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Install this plugin to configure it
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed">
                Click <strong>Install Plugin</strong> above to add {displayName} to your site and unlock its configuration fields right on this page.
              </p>
            </section>
          )}

          {/* ── Inline Danger Zone (Zero Popups) ───────────────────── */}
          {plugin && (
            <section className="rounded-2xl border border-red-200 bg-white p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Uninstall {plugin.name}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Immediately stops this plugin from running and removes its saved settings.
                  </p>
                </div>

                {!confirmUninstall ? (
                  <button
                    type="button"
                    onClick={() => setConfirmUninstall(true)}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden />
                    Uninstall Plugin
                  </button>
                ) : (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      disabled={uninstalling}
                      onClick={() => setConfirmUninstall(false)}
                      className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={uninstalling}
                      onClick={handleUninstall}
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors whitespace-nowrap"
                    >
                      {uninstalling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Confirm Uninstall
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
