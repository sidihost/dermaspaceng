'use client'

/**
 * /admin/addons/custom — Dedicated Install Custom Plugin Page
 *
 * Full-page flow (zero popups or modal dialogs) to add a verified HTTPS
 * script plugin, floating action widget, or JSON plugin manifest.
 *
 * Design system compliance:
 *   - Brand purple #7B2D8E, crisp white surfaces, hairline gray-200 borders
 *   - Strictly flat: NO shadows, NO gradients
 *   - Strictly NO Sparkles or Zap icons
 *   - Strictly NO modals or popups
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Download,
  FileJson,
  Loader2,
  Plug,
  Upload,
} from 'lucide-react'
import { useNotify } from '@/components/shared/notify'
import type { InstalledPlugin, PluginCategory } from '@/lib/plugins'

const SAMPLE_MANIFEST_JSON = JSON.stringify(
  {
    slug: 'instagram-concierge',
    name: 'Instagram Direct Button',
    version: '1.0.0',
    author: 'Dermaspace Studio',
    description:
      'Adds a floating button on public pages that directs visitors straight to our Instagram profile.',
    category: 'marketing',
    kind: 'widget',
    widgetLabel: 'Follow on Instagram',
    widgetUrl: 'https://instagram.com/dermaspaceng',
  },
  null,
  2,
)

export default function InstallCustomPluginPage() {
  const router = useRouter()
  const notify = useNotify()

  const [mode, setMode] = useState<'custom' | 'manifest'>('custom')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [version, setVersion] = useState('1.0.0')
  const [author, setAuthor] = useState('Dermaspace')
  const [category, setCategory] = useState<PluginCategory>('integrations')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<'script' | 'widget'>('script')
  const [scriptUrl, setScriptUrl] = useState('')
  const [widgetLabel, setWidgetLabel] = useState('')
  const [widgetUrl, setWidgetUrl] = useState('')
  const [manifestJson, setManifestJson] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 16_000) {
      setError('Manifest file must be 16 KB or smaller.')
      return
    }
    try {
      const text = await file.text()
      setManifestJson(text)
      setError(null)
    } catch {
      setError('Could not read the selected JSON file.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const payload =
        mode === 'manifest'
          ? { mode: 'manifest', manifest: manifestJson }
          : {
              mode: 'custom',
              plugin: {
                name,
                slug: slug.trim() || undefined,
                version,
                author,
                category,
                description,
                kind,
                scriptUrl: kind === 'script' ? scriptUrl : undefined,
                widgetLabel: kind === 'widget' ? widgetLabel : undefined,
                widgetUrl: kind === 'widget' ? widgetUrl : undefined,
              },
            }

      const res = await fetch('/api/admin/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as {
        plugin?: InstalledPlugin
        error?: string
      }
      if (!res.ok) {
        setError(data.error || 'Could not install custom plugin.')
        return
      }
      if (data.plugin) {
        notify.success(`${data.plugin.name} installed`, 'Your custom plugin is now active.')
        router.push(`/admin/addons/${encodeURIComponent(data.plugin.slug)}`)
        router.refresh()
      } else {
        router.push('/admin/addons')
      }
    } catch {
      setError('Network error while installing plugin.')
    } finally {
      setSubmitting(false)
    }
  }

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

      {/* ── Page Header ────────────────────────────────────────────── */}
      <header className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#F8F2FB] border border-[#7B2D8E]/20 flex items-center justify-center flex-shrink-0">
          <Plug className="w-5 h-5 text-[#7B2D8E]" aria-hidden />
        </div>
        <div>
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-none tracking-tight">
            Install Custom Plugin
          </h1>
          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
            Connect a verified public HTTPS script, add a floating action widget, or import a validated JSON plugin manifest.
          </p>
        </div>
      </header>

      {/* ── Dedicated Setup Card ───────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200 max-w-md">
            <button
              type="button"
              onClick={() => {
                setMode('custom')
                setError(null)
              }}
              className={`h-8 rounded-md text-xs font-semibold border transition-colors ${
                mode === 'custom'
                  ? 'bg-white text-[#7B2D8E] border-gray-200'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Manual Setup
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('manifest')
                setError(null)
              }}
              className={`h-8 rounded-md text-xs font-semibold border transition-colors inline-flex items-center justify-center gap-1.5 ${
                mode === 'manifest'
                  ? 'bg-white text-[#7B2D8E] border-gray-200'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" aria-hidden />
              Import JSON Manifest
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'custom' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="install-plugin-name"
                    className="block text-xs font-semibold text-gray-700 mb-1.5"
                  >
                    Plugin Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="install-plugin-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Hotjar Heatmaps"
                    className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="install-plugin-slug"
                    className="block text-xs font-semibold text-gray-700 mb-1.5"
                  >
                    Slug (optional)
                  </label>
                  <input
                    id="install-plugin-slug"
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="auto-generated from name"
                    className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="install-plugin-category"
                    className="block text-xs font-semibold text-gray-700 mb-1.5"
                  >
                    Category
                  </label>
                  <select
                    id="install-plugin-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as PluginCategory)}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] outline-none"
                  >
                    <option value="integrations">Integrations</option>
                    <option value="analytics">Analytics</option>
                    <option value="marketing">Marketing</option>
                    <option value="customer">Customer</option>
                    <option value="booking">Booking</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="install-plugin-version"
                    className="block text-xs font-semibold text-gray-700 mb-1.5"
                  >
                    Version
                  </label>
                  <input
                    id="install-plugin-version"
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="1.0.0"
                    className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="install-plugin-author"
                    className="block text-xs font-semibold text-gray-700 mb-1.5"
                  >
                    Author
                  </label>
                  <input
                    id="install-plugin-author"
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Vendor name"
                    className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="install-plugin-description"
                  className="block text-xs font-semibold text-gray-700 mb-1.5"
                >
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="install-plugin-description"
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly explain what this plugin adds to Dermaspace."
                  className="w-full p-3 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] outline-none resize-none"
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1.5">
                  Plugin Type
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setKind('script')}
                    className={`p-3.5 rounded-xl border text-left transition-colors ${
                      kind === 'script'
                        ? 'border-[#7B2D8E] bg-[#F8F2FB]'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="text-xs font-semibold text-gray-900">
                      HTTPS Script Embed
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Loads an external public https:// script asynchronously.
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setKind('widget')}
                    className={`p-3.5 rounded-xl border text-left transition-colors ${
                      kind === 'widget'
                        ? 'border-[#7B2D8E] bg-[#F8F2FB]'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="text-xs font-semibold text-gray-900">
                      Floating Action Widget
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Shows a floating quick-link button on public pages.
                    </div>
                  </button>
                </div>
              </div>

              {kind === 'script' ? (
                <div>
                  <label
                    htmlFor="install-script-url"
                    className="block text-xs font-semibold text-gray-700 mb-1.5"
                  >
                    Public HTTPS Script URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="install-script-url"
                    type="url"
                    required
                    value={scriptUrl}
                    onChange={(e) => setScriptUrl(e.target.value)}
                    placeholder="https://cdn.vendor.com/plugin.min.js"
                    className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] outline-none"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Only verified public https:// URLs are permitted.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="install-widget-label"
                      className="block text-xs font-semibold text-gray-700 mb-1.5"
                    >
                      Button Label <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="install-widget-label"
                      type="text"
                      required
                      value={widgetLabel}
                      onChange={(e) => setWidgetLabel(e.target.value)}
                      placeholder="e.g. Follow on Instagram"
                      className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="install-widget-url"
                      className="block text-xs font-semibold text-gray-700 mb-1.5"
                    >
                      Destination Link <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="install-widget-url"
                      type="text"
                      required
                      value={widgetUrl}
                      onChange={(e) => setWidgetUrl(e.target.value)}
                      placeholder="/consultation or https://..."
                      className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] outline-none"
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" aria-hidden />
                    Choose .json file
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManifestJson(SAMPLE_MANIFEST_JSON)
                      setError(null)
                    }}
                    className="text-xs font-semibold text-[#7B2D8E] hover:underline"
                  >
                    Load sample template
                  </button>
                </div>
                <span className="text-[11px] text-gray-400">Max 16 KB</span>
              </div>

              <label htmlFor="manifest-json-input" className="sr-only">
                Plugin Manifest JSON
              </label>
              <textarea
                id="manifest-json-input"
                rows={12}
                required
                value={manifestJson}
                onChange={(e) => setManifestJson(e.target.value)}
                placeholder={SAMPLE_MANIFEST_JSON}
                className="w-full p-3.5 text-xs font-mono rounded-xl border border-gray-200 bg-[#F8F7FA] focus:bg-white focus:border-[#7B2D8E] outline-none resize-y"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
            <Link
              href="/admin/addons"
              className="inline-flex items-center justify-center h-9 px-4 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] disabled:opacity-60 transition-colors"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" aria-hidden />
              )}
              Install Plugin
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
