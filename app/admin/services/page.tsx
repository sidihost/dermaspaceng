'use client'

/**
 * Admin → Services & Catalog.
 *
 * Lets admins curate the public services catalog without a deploy.
 * The page mirrors the visual language of /admin/bookings and
 * /admin/users (purple brand + neutral chrome, status pills, soft
 * cards). Three things you can do here:
 *
 *   1. Browse every category (code-shipped + admin-added) with a
 *      single source pill telling you whether each row is part of the
 *      base catalog, an override, a custom addition or paused.
 *   2. Edit any treatment in place — name, price, duration, description,
 *      "popular" flag and active state — via a slide-over editor.
 *      Edits to code-defined rows transparently create override rows
 *      so the public site reflects the change immediately.
 *   3. Add brand-new categories or treatments. New categories get an
 *      auto-suggested slug; new treatments inherit the category they're
 *      created from.
 *
 * Mutations call the routes under /api/admin/services/. We re-fetch
 * the list on every successful action so the UI never drifts from
 * what the merger will return on the public site.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  Tag,
  Layers,
  Clock,
  CheckCircle2,
  CircleSlash,
  X,
  Save,
  AlertCircle,
  Star,
  ChevronDown,
  Boxes,
  FolderPlus,
  PackagePlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotify } from '@/components/shared/notify'

interface Treatment {
  id: string
  dbId: string | null
  categorySlug: string
  slug: string
  name: string
  durationMinutes: number
  priceNaira: number
  description: string
  popular: boolean
  concerns: string[]
  isActive: boolean
  displayOrder: number
  source: 'code' | 'override' | 'custom' | 'disabled'
  updatedAt: string | null
}

interface Category {
  id: string
  dbId: string | null
  slug: string
  title: string
  tagline: string
  description: string
  image: string
  displayOrder: number
  isActive: boolean
  source: 'code' | 'override' | 'custom' | 'disabled'
  updatedAt: string | null
  treatments: Treatment[]
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error('Request failed')
    return r.json()
  })

function formatNaira(naira: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(naira)
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function SourcePill({ source }: { source: Category['source'] }) {
  const map = {
    code: {
      label: 'Base',
      className: 'bg-gray-100 text-gray-700 ring-gray-200',
    },
    override: {
      label: 'Edited',
      className: 'bg-[#7B2D8E]/10 text-[#7B2D8E] ring-[#7B2D8E]/20',
    },
    custom: {
      label: 'Custom',
      // Was emerald — moved to deep brand purple so the badge
      // still reads as "more changed than Edited" via tint depth
      // instead of via a green hue that didn't belong on this
      // page. (`Edited` already uses the lighter purple.)
      className: 'bg-[#5A1D6A]/10 text-[#5A1D6A] ring-[#5A1D6A]/20',
    },
    disabled: {
      label: 'Paused',
      className: 'bg-amber-50 text-amber-700 ring-amber-200',
    },
  } as const
  const m = map[source]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ring-1',
        m.className,
      )}
    >
      {m.label}
    </span>
  )
}

export default function AdminServicesPage() {
  const notify = useNotify()
  const { data, isLoading, mutate } = useSWR<{ categories: Category[] }>(
    '/api/admin/services',
    fetcher,
  )
  const categories = data?.categories ?? []

  const [search, setSearch] = useState('')
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  // Default-open the first category once data loads so the page never
  // looks empty on first paint.
  useEffect(() => {
    if (!openCategory && categories.length > 0) {
      setOpenCategory(categories[0].slug)
    }
  }, [categories, openCategory])

  const [editing, setEditing] = useState<
    | { kind: 'category'; mode: 'edit'; data: Category }
    | { kind: 'category'; mode: 'create' }
    | { kind: 'treatment'; mode: 'edit'; data: Treatment; category: Category }
    | { kind: 'treatment'; mode: 'create'; category: Category }
    | null
  >(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return categories
    const q = search.trim().toLowerCase()
    return categories
      .map((c) => ({
        ...c,
        treatments: c.treatments.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.slug.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q),
        ),
      }))
      .filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          c.treatments.length > 0,
      )
  }, [categories, search])

  const totalTreatments = categories.reduce(
    (acc, c) => acc + c.treatments.filter((t) => t.isActive).length,
    0,
  )
  const editedCount = categories.reduce(
    (acc, c) =>
      acc +
      (c.source === 'override' || c.source === 'custom' ? 1 : 0) +
      c.treatments.filter((t) => t.source === 'override' || t.source === 'custom').length,
    0,
  )
  const pausedCount = categories.reduce(
    (acc, c) =>
      acc +
      (c.source === 'disabled' ? 1 : 0) +
      c.treatments.filter((t) => !t.isActive).length,
    0,
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-[#7B2D8E]" />
            Services & Catalog
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage every category and treatment customers can book. Edits
            publish to the public site instantly.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing({ kind: 'category', mode: 'create' })}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[#7B2D8E]/30 text-sm font-medium text-[#7B2D8E] hover:bg-[#7B2D8E]/5"
          >
            <FolderPlus className="w-4 h-4" />
            New category
          </button>
        </div>
      </header>

      {/* Stats tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile
          label="Categories"
          value={categories.length.toString()}
          icon={Layers}
          tone="purple"
        />
        <StatTile
          label="Live treatments"
          value={totalTreatments.toString()}
          icon={Tag}
          // Was `emerald` — switched to the lighter brand variant
          // so the row of stats stays inside the Dermaspace
          // palette. Visual variety is now driven by tint depth
          // (deep purple vs soft purple) rather than by hue.
          tone="brand-soft"
        />
        <StatTile
          label="Edited / Custom"
          value={editedCount.toString()}
          icon={Pencil}
          tone="purple"
        />
        <StatTile
          label="Paused"
          value={pausedCount.toString()}
          icon={CircleSlash}
          tone="amber"
        />
      </div>

      {/* Search */}
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by treatment, category, or slug…"
            className="w-full pl-9 pr-9 py-2.5 text-sm bg-gray-50 rounded-lg ring-1 ring-gray-200 focus:ring-2 focus:ring-[#7B2D8E] focus:bg-white focus:outline-none placeholder:text-gray-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 grid place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Categories list */}
      {isLoading && categories.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-[#7B2D8E]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <Boxes className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">No matches</p>
          <p className="text-xs text-gray-500 mt-1">
            Try a different search or add a new category to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((cat) => (
            <CategoryAccordion
              key={cat.slug}
              category={cat}
              isOpen={openCategory === cat.slug}
              onToggle={() =>
                setOpenCategory(openCategory === cat.slug ? null : cat.slug)
              }
              onEditCategory={() =>
                setEditing({ kind: 'category', mode: 'edit', data: cat })
              }
              onAddTreatment={() =>
                setEditing({ kind: 'treatment', mode: 'create', category: cat })
              }
              onEditTreatment={(t) =>
                setEditing({
                  kind: 'treatment',
                  mode: 'edit',
                  data: t,
                  category: cat,
                })
              }
              onDeleteTreatment={async (t) => {
                if (
                  !confirm(
                    `Remove "${t.name}"? Customers will no longer see it on the booking page.`,
                  )
                ) {
                  return
                }
                const res = await fetch(
                  `/api/admin/services/treatments/${cat.slug}/${t.slug}`,
                  { method: 'DELETE' },
                )
                if (res.ok) {
                  notify.success('Treatment removed')
                  mutate()
                } else {
                  const body = await res.json().catch(() => ({}))
                  notify.error(
                    'Could not remove',
                    body?.error ?? 'Please try again.',
                  )
                }
              }}
              onPublishToggle={async () => {
                const res = await fetch(
                  `/api/admin/services/categories/${cat.slug}`,
                  {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      title: cat.title,
                      tagline: cat.tagline,
                      description: cat.description,
                      image: cat.image,
                      isActive: !cat.isActive,
                    }),
                  },
                )
                if (res.ok) {
                  notify.success(
                    cat.isActive ? 'Category paused' : 'Category published',
                  )
                  mutate()
                } else {
                  notify.error('Could not update')
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Editor sheet */}
      {editing && (
        <EditorSheet
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            mutate()
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  // Variants:
  //   purple      — primary brand fill, used for the headline tile
  //                 (Categories) and any "edits" tile.
  //   brand-soft  — same hue at a lower saturation so two adjacent
  //                 brand tiles can sit next to each other without
  //                 looking identical. Replaces the old `emerald`
  //                 variant so the page stays on-palette.
  //   amber       — kept as a true warning tone for paused items.
  tone: 'purple' | 'brand-soft' | 'amber'
  }) {
  const dot =
    tone === 'brand-soft'
      ? 'bg-[#7B2D8E]/[0.06] text-[#7B2D8E]/80'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3.5 flex items-center gap-3">
      <div className={cn('p-2 rounded-md', dot)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-gray-900 leading-tight tabular-nums">
          {value}
        </p>
        <p className="text-xs text-gray-500 truncate">{label}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Category accordion
// ---------------------------------------------------------------------------

function CategoryAccordion({
  category,
  isOpen,
  onToggle,
  onEditCategory,
  onAddTreatment,
  onEditTreatment,
  onDeleteTreatment,
  onPublishToggle,
}: {
  category: Category
  isOpen: boolean
  onToggle: () => void
  onEditCategory: () => void
  onAddTreatment: () => void
  onEditTreatment: (t: Treatment) => void
  onDeleteTreatment: (t: Treatment) => void
  onPublishToggle: () => void
}) {
  const liveCount = category.treatments.filter((t) => t.isActive).length
  return (
    <section
      className={cn(
        'rounded-2xl border bg-white transition-colors',
        category.isActive
          ? 'border-gray-200'
          : 'border-amber-200 bg-amber-50/30',
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 p-4">
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 min-w-0 flex items-center gap-3 text-left"
        >
          <div
            className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0',
              category.isActive
                ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                : 'bg-amber-50 text-amber-700',
            )}
          >
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[15px] font-semibold text-gray-900 truncate">
                {category.title}
              </h2>
              <SourcePill source={category.source} />
              {!category.isActive && (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-amber-700">
                  <CircleSlash className="w-3 h-3" />
                  Paused
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {liveCount} live · /{category.slug}
              {category.tagline ? ` · ${category.tagline}` : ''}
            </p>
          </div>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-gray-400 flex-shrink-0 transition-transform',
              isOpen && 'rotate-180',
            )}
          />
        </button>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={onPublishToggle}
            className={cn(
              'h-8 px-2.5 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 transition-colors',
              category.isActive
                ? 'border border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50'
                // "Publish" was emerald — the page is otherwise
                // strictly purple/neutral, so the green button
                // jumped out of the palette. Brand purple still
                // reads as the primary positive action without
                // breaking the colour story.
                : 'border border-[#7B2D8E]/30 bg-[#7B2D8E]/10 text-[#7B2D8E] hover:bg-[#7B2D8E]/15',
            )}
            title={category.isActive ? 'Pause category' : 'Publish category'}
          >
            {category.isActive ? (
              <>
                <CircleSlash className="w-3.5 h-3.5" />
                Pause
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Publish
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onEditCategory}
            className="h-8 w-8 rounded-md grid place-items-center text-gray-500 hover:bg-gray-100 hover:text-[#7B2D8E]"
            title="Edit category"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Treatments list */}
      {isOpen && (
        <div className="border-t border-gray-100 p-3 sm:p-4 space-y-2">
          {category.treatments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center">
              <p className="text-xs text-gray-500">
                No treatments under this category yet.
              </p>
            </div>
          ) : (
            category.treatments
              .slice()
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((t) => (
                <TreatmentRow
                  key={t.slug + (t.dbId ?? '')}
                  treatment={t}
                  onEdit={() => onEditTreatment(t)}
                  onDelete={() => onDeleteTreatment(t)}
                />
              ))
          )}

          <button
            type="button"
            onClick={onAddTreatment}
            className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-xl border border-dashed border-[#7B2D8E]/30 text-[#7B2D8E] text-sm font-medium hover:bg-[#7B2D8E]/5 transition-colors"
          >
            <PackagePlus className="w-4 h-4" />
            Add treatment to {category.title}
          </button>
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Treatment row
// ---------------------------------------------------------------------------

function TreatmentRow({
  treatment,
  onEdit,
  onDelete,
}: {
  treatment: Treatment
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-white p-3 transition-colors',
        treatment.isActive
          ? 'border-gray-100 hover:border-[#7B2D8E]/30'
          : 'border-amber-100 bg-amber-50/40',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {treatment.name}
          </p>
          {treatment.popular && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
              <Star className="w-2.5 h-2.5 fill-current" />
              Popular
            </span>
          )}
          <SourcePill source={treatment.source} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {treatment.durationMinutes} min
          </span>
          <span className="font-mono text-gray-400">/{treatment.slug}</span>
          {treatment.concerns.length > 0 && (
            <span className="truncate max-w-[18rem]">
              {treatment.concerns.slice(0, 3).join(' · ')}
              {treatment.concerns.length > 3 ? '…' : ''}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm font-semibold text-gray-900 tabular-nums whitespace-nowrap">
        {formatNaira(treatment.priceNaira)}
      </p>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="h-8 w-8 rounded-md grid place-items-center text-gray-500 hover:bg-gray-100 hover:text-[#7B2D8E]"
          title="Edit"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="h-8 w-8 rounded-md grid place-items-center text-gray-500 hover:bg-rose-50 hover:text-rose-600"
          title="Remove"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editor sheet (slide-over) — handles both category + treatment forms.
// ---------------------------------------------------------------------------

type EditorState =
  | { kind: 'category'; mode: 'edit'; data: Category }
  | { kind: 'category'; mode: 'create' }
  | { kind: 'treatment'; mode: 'edit'; data: Treatment; category: Category }
  | { kind: 'treatment'; mode: 'create'; category: Category }

function EditorSheet({
  editing,
  onClose,
  onSaved,
}: {
  editing: EditorState
  onClose: () => void
  onSaved: () => void
}) {
  const notify = useNotify()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Category form state
  const initialCat = editing.kind === 'category' && editing.mode === 'edit' ? editing.data : null
  const [catSlug, setCatSlug] = useState(initialCat?.slug ?? '')
  const [catTitle, setCatTitle] = useState(initialCat?.title ?? '')
  const [catTagline, setCatTagline] = useState(initialCat?.tagline ?? '')
  const [catDescription, setCatDescription] = useState(initialCat?.description ?? '')
  const [catImage, setCatImage] = useState(initialCat?.image ?? '')
  const [catActive, setCatActive] = useState(initialCat?.isActive ?? true)

  // Treatment form state
  const initialT =
    editing.kind === 'treatment' && editing.mode === 'edit' ? editing.data : null
  const [tName, setTName] = useState(initialT?.name ?? '')
  const [tSlug, setTSlug] = useState(initialT?.slug ?? '')
  const [tDuration, setTDuration] = useState(
    initialT ? String(initialT.durationMinutes) : '60',
  )
  const [tPrice, setTPrice] = useState(
    initialT ? String(initialT.priceNaira) : '',
  )
  const [tDescription, setTDescription] = useState(initialT?.description ?? '')
  const [tPopular, setTPopular] = useState(!!initialT?.popular)
  const [tConcerns, setTConcerns] = useState(
    initialT?.concerns?.join(', ') ?? '',
  )
  const [tActive, setTActive] = useState(initialT?.isActive ?? true)

  // Auto-suggest slug for new entries.
  const isCreatingCategory = editing.kind === 'category' && editing.mode === 'create'
  const isCreatingTreatment = editing.kind === 'treatment' && editing.mode === 'create'

  useEffect(() => {
    if (isCreatingCategory && catTitle && !catSlug) {
      setCatSlug(slugify(catTitle))
    }
  }, [catTitle, catSlug, isCreatingCategory])

  useEffect(() => {
    if (isCreatingTreatment && tName && !tSlug) {
      setTSlug(slugify(tName))
    }
  }, [tName, tSlug, isCreatingTreatment])

  const handleSubmit = useCallback(async () => {
    setError('')
    setSaving(true)
    try {
      if (editing.kind === 'category') {
        const payload = {
          slug: catSlug || undefined,
          title: catTitle,
          tagline: catTagline,
          description: catDescription,
          image: catImage,
          isActive: catActive,
        }
        let res: Response
        if (editing.mode === 'create') {
          res = await fetch('/api/admin/services/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        } else {
          res = await fetch(
            `/api/admin/services/categories/${editing.data.slug}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            },
          )
        }
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body?.error || 'Could not save')
        notify.success(
          editing.mode === 'create' ? 'Category created' : 'Category updated',
        )
        onSaved()
      } else {
        const concerns = tConcerns
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        const payload = {
          categorySlug:
            editing.mode === 'edit'
              ? editing.data.categorySlug
              : editing.category.slug,
          slug: tSlug,
          name: tName,
          durationMinutes: Number(tDuration) || 0,
          priceNaira: Number(tPrice) || 0,
          description: tDescription,
          popular: tPopular,
          concerns,
          isActive: tActive,
        }
        let res: Response
        if (editing.mode === 'create') {
          res = await fetch('/api/admin/services/treatments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        } else {
          res = await fetch(
            `/api/admin/services/treatments/${editing.data.categorySlug}/${editing.data.slug}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            },
          )
        }
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body?.error || 'Could not save')
        notify.success(
          editing.mode === 'create' ? 'Treatment added' : 'Treatment updated',
        )
        onSaved()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save'
      setError(msg)
      notify.error('Save failed', msg)
    } finally {
      setSaving(false)
    }
  }, [
    editing,
    catActive,
    catDescription,
    catImage,
    catSlug,
    catTagline,
    catTitle,
    notify,
    onSaved,
    tActive,
    tConcerns,
    tDescription,
    tDuration,
    tName,
    tPopular,
    tPrice,
    tSlug,
  ])

  const title =
    editing.kind === 'category'
      ? editing.mode === 'create'
        ? 'New category'
        : `Edit ${editing.data.title}`
      : editing.mode === 'create'
        ? `Add treatment to ${editing.category.title}`
        : `Edit ${editing.data.name}`

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close editor"
        onClick={onClose}
        className="flex-1 bg-gray-900/40 backdrop-blur-[1px]"
      />
      {/* Panel */}
      <div className="w-full sm:max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <header className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between z-10">
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#7B2D8E]">
              {editing.kind === 'category' ? 'Category' : 'Treatment'}
            </p>
            <h2 className="text-base font-semibold text-gray-900 truncate">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-md grid place-items-center text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
          className="flex-1 px-5 py-5 space-y-4"
        >
          {editing.kind === 'category' ? (
            <>
              <Field label="Title" required>
                <input
                  type="text"
                  required
                  value={catTitle}
                  onChange={(e) => setCatTitle(e.target.value)}
                  placeholder="e.g. Skin Coaching"
                  className="input"
                />
              </Field>
              <Field
                label="Slug"
                required
                hint="URL-friendly id. Used in /services/<slug>."
              >
                <input
                  type="text"
                  required
                  value={catSlug}
                  onChange={(e) => setCatSlug(slugify(e.target.value))}
                  disabled={editing.mode === 'edit'}
                  placeholder="skin-coaching"
                  className="input font-mono"
                />
              </Field>
              <Field label="Tagline">
                <input
                  type="text"
                  value={catTagline}
                  onChange={(e) => setCatTagline(e.target.value)}
                  placeholder="A short, punchy line shown under the title"
                  className="input"
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  rows={3}
                  placeholder="What this category is about. Shown on the public site."
                  className="input resize-none"
                />
              </Field>
              <Field label="Cover image URL">
                <input
                  type="url"
                  value={catImage}
                  onChange={(e) => setCatImage(e.target.value)}
                  placeholder="https://…"
                  className="input"
                />
              </Field>
              <ToggleField
                label="Published"
                hint="When off, the category is hidden from /services and the booking wizard."
                checked={catActive}
                onChange={setCatActive}
              />
            </>
          ) : (
            <>
              <Field label="Treatment name" required>
                <input
                  type="text"
                  required
                  value={tName}
                  onChange={(e) => setTName(e.target.value)}
                  placeholder="e.g. Carbon Laser Peel"
                  className="input"
                />
              </Field>
              <Field
                label="Slug"
                required
                hint="Lowercase id, unique within the category."
              >
                <input
                  type="text"
                  required
                  value={tSlug}
                  onChange={(e) => setTSlug(slugify(e.target.value))}
                  disabled={editing.mode === 'edit'}
                  placeholder="carbon-laser-peel"
                  className="input font-mono"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Duration (mins)" required>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    required
                    value={tDuration}
                    onChange={(e) => setTDuration(e.target.value)}
                    className="input tabular-nums"
                  />
                </Field>
                <Field label="Price (₦)" required>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    required
                    value={tPrice}
                    onChange={(e) => setTPrice(e.target.value)}
                    placeholder="25000"
                    className="input tabular-nums"
                  />
                </Field>
              </div>
              <Field label="Description">
                <textarea
                  value={tDescription}
                  onChange={(e) => setTDescription(e.target.value)}
                  rows={3}
                  placeholder="What customers see when they tap this treatment."
                  className="input resize-none"
                />
              </Field>
              <Field
                label="Concern tags"
                hint="Comma-separated. Helps semantic search match this treatment."
              >
                <input
                  type="text"
                  value={tConcerns}
                  onChange={(e) => setTConcerns(e.target.value)}
                  placeholder="acne, oily skin, breakouts"
                  className="input"
                />
              </Field>
              <ToggleField
                label="Mark as popular"
                hint="Shows the popular badge on the public catalog and boosts in search."
                checked={tPopular}
                onChange={setTPopular}
              />
              <ToggleField
                label="Published"
                hint="When off, customers won't see this treatment on the site."
                checked={tActive}
                onChange={setTActive}
              />
            </>
          )}

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-rose-700">{error}</p>
            </div>
          )}
        </form>

        <footer className="sticky bottom-0 bg-white border-t border-gray-200 px-5 py-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="h-9 px-3.5 rounded-lg bg-[#7B2D8E] text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-[#5A1D6A] disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {editing.mode === 'create' ? 'Create' : 'Save changes'}
          </button>
        </footer>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          height: 38px;
          padding: 0 0.75rem;
          font-size: 13.5px;
          background: #fff;
          border-radius: 8px;
          border: 1px solid rgb(229 231 235);
          outline: none;
          transition: border-color 120ms, box-shadow 120ms;
        }
        textarea.input {
          height: auto;
          min-height: 80px;
          padding: 0.6rem 0.75rem;
          line-height: 1.5;
        }
        .input:focus {
          border-color: #7b2d8e;
          box-shadow: 0 0 0 3px rgba(123, 45, 142, 0.12);
        }
        .input:disabled {
          background: #f9fafb;
          color: #6b7280;
        }
      `}</style>
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-semibold text-gray-700 mb-1">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {hint && <span className="block text-[10.5px] text-gray-500 mt-1">{hint}</span>}
    </label>
  )
}

function ToggleField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-2.5 cursor-pointer hover:border-[#7B2D8E]/30 transition-colors">
      <span
        role="switch"
        aria-checked={checked}
        onClick={(e) => {
          e.preventDefault()
          onChange(!checked)
        }}
        className={cn(
          'mt-0.5 inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0',
          checked ? 'bg-[#7B2D8E]' : 'bg-gray-200',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span className="min-w-0">
        <span className="block text-[12.5px] font-medium text-gray-900">{label}</span>
        {hint && <span className="block text-[11px] text-gray-500 mt-0.5">{hint}</span>}
      </span>
    </label>
  )
}
