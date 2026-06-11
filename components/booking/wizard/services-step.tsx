'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { ChevronDown, Clock, Plus, Check, Star } from 'lucide-react'
import { SERVICES_CATALOG, type CatalogCategory } from '@/lib/services-catalog'
import type { WizardServiceChoice } from './types'

interface ServicesStepProps {
  selected: WizardServiceChoice[]
  onChange: (next: WizardServiceChoice[]) => void
}

const formatNaira = (kobo: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(kobo / 100)

const catalogFetcher = (url: string) =>
  fetch(url)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('catalog'))))
    .then(
      (body) =>
        ((body?.catalog as CatalogCategory[] | undefined) ?? SERVICES_CATALOG) as CatalogCategory[],
    )

export function ServicesStep({ selected, onChange }: ServicesStepProps) {
  // Live-merged catalog (code + admin edits). We seed SWR with the
  // static catalog so the wizard renders instantly on first paint
  // and only refines once the API responds. Focus + reconnect
  // revalidation + a 60s refresh interval (matching the route's
  // `revalidate = 60` edge cache) means admin price/name edits show
  // up for the customer within a minute, or instantly when they
  // bring the tab back to the foreground.
  const { data: catalog = SERVICES_CATALOG } = useSWR<CatalogCategory[]>(
    '/api/services-catalog',
    catalogFetcher,
    {
      fallbackData: SERVICES_CATALOG as CatalogCategory[],
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 60_000,
    },
  )

  // Track which categories are expanded. Default to "first category open"
  // to give the user something to act on without scrolling.
  const [openIds, setOpenIds] = useState<Record<string, boolean>>(() => ({
    [catalog[0]?.slug ?? '']: true,
  }))

  // Treatments with variants (massage session lengths, couple
  // options, …) expand into a breakdown picker instead of toggling
  // directly. Keyed `${categorySlug}::${treatmentId}`.
  const [openVariantIds, setOpenVariantIds] = useState<Record<string, boolean>>(
    {},
  )

  const selectedKey = useMemo(
    () => new Set(selected.map((s) => `${s.categoryId}::${s.treatmentId}`)),
    [selected],
  )
  // Which exact variant is selected per treatment, so the breakdown
  // rows can render their radio state.
  const selectedVariantByTreatment = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of selected) {
      if (s.variantId) map.set(`${s.categoryId}::${s.treatmentId}`, s.variantId)
    }
    return map
  }, [selected])

  const toggleService = (
    categoryId: string,
    categoryName: string,
    treatmentId: string,
    treatmentName: string,
    duration: number,
    priceKobo: number,
  ) => {
    const key = `${categoryId}::${treatmentId}`
    if (selectedKey.has(key)) {
      onChange(
        selected.filter(
          (s) => !(s.categoryId === categoryId && s.treatmentId === treatmentId),
        ),
      )
      return
    }
    onChange([
      ...selected,
      {
        categoryId,
        categoryName,
        treatmentId,
        treatmentName,
        duration,
        priceKobo,
      },
    ])
  }

  // Variant selection is radio-like per treatment: tapping the
  // already-selected option deselects it; tapping a different option
  // replaces the previous one (you book ONE configuration of a
  // massage, not two lengths of the same massage).
  const toggleVariant = (
    categoryId: string,
    categoryName: string,
    treatmentId: string,
    treatmentName: string,
    variant: { id: string; label: string; duration: string; price: number },
  ) => {
    const current = selectedVariantByTreatment.get(
      `${categoryId}::${treatmentId}`,
    )
    const without = selected.filter(
      (s) => !(s.categoryId === categoryId && s.treatmentId === treatmentId),
    )
    if (current === variant.id) {
      onChange(without)
      return
    }
    const m = variant.duration.match(/(\d+)/)
    onChange([
      ...without,
      {
        categoryId,
        categoryName,
        treatmentId,
        treatmentName,
        variantId: variant.id,
        variantLabel: variant.label,
        duration: m ? parseInt(m[1], 10) : 60,
        priceKobo: variant.price * 100,
      },
    ])
  }

  const totalDuration = selected.reduce((s, x) => s + x.duration, 0)
  const totalKobo = selected.reduce((s, x) => s + x.priceKobo, 0)

  const parseDuration = (label: string): number => {
    const m = label.match(/(\d+)/)
    return m ? parseInt(m[1], 10) : 60
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {catalog.map((category) => {
          const isOpen = !!openIds[category.slug]
          const countSelected = selected.filter(
            (s) => s.categoryId === category.slug,
          ).length

          return (
            <section
              key={category.slug}
              className={[
                'overflow-hidden rounded-2xl border bg-white transition-colors',
                isOpen ? 'border-[#7B2D8E]/30' : 'border-gray-200',
              ].join(' ')}
            >
              <button
                type="button"
                onClick={() =>
                  setOpenIds((prev) => ({ ...prev, [category.slug]: !prev[category.slug] }))
                }
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {category.title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-gray-500 line-clamp-1">
                    {category.tagline}
                  </p>
                </div>
                {countSelected > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E]/10 px-2 py-0.5 text-[11px] font-semibold text-[#7B2D8E]">
                    <Check className="h-3 w-3" />
                    {countSelected}
                  </span>
                ) : null}
                <ChevronDown
                  className={[
                    'h-5 w-5 shrink-0 text-gray-400 transition-transform',
                    isOpen ? 'rotate-180' : '',
                  ].join(' ')}
                />
              </button>

              {isOpen ? (
                <ul className="divide-y divide-gray-100 border-t border-gray-100">
                  {category.treatments.map((tr) => {
                    const duration = parseDuration(tr.duration)
                    const priceKobo = tr.priceFrom * 100
                    const key = `${category.slug}::${tr.id}`
                    const isSelected = selectedKey.has(key)
                    const hasVariants = (tr.variants?.length ?? 0) > 0
                    // Breakdown stays open while an option is selected
                    // so the customer (and frontdesk, when assisting)
                    // always sees WHICH option is in the cart.
                    const variantsOpen =
                      hasVariants && (!!openVariantIds[key] || isSelected)
                    const selectedVariantId =
                      selectedVariantByTreatment.get(key)
                    return (
                      <li key={tr.id}>
                        <button
                          type="button"
                          onClick={() =>
                            hasVariants
                              ? setOpenVariantIds((prev) => ({
                                  ...prev,
                                  [key]: !variantsOpen,
                                }))
                              : toggleService(
                                  category.slug,
                                  category.title,
                                  tr.id,
                                  tr.name,
                                  duration,
                                  priceKobo,
                                )
                          }
                          aria-expanded={hasVariants ? variantsOpen : undefined}
                          className={[
                            'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                            isSelected ? 'bg-[#7B2D8E]/5' : 'hover:bg-gray-50',
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                              isSelected
                                ? 'border-[#7B2D8E] bg-[#7B2D8E] text-white'
                                : 'border-gray-300 bg-white text-transparent',
                            ].join(' ')}
                            aria-hidden="true"
                          >
                            {isSelected ? (
                              <Check className="h-3 w-3" strokeWidth={3} />
                            ) : (
                              <Plus className="h-3 w-3 text-gray-400" strokeWidth={2.5} />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-gray-900">
                                {tr.name}
                              </p>
                              {tr.popular ? (
                                // Recoloured from amber → brand
                                // purple. The amber chip was the
                                // only non-brand colour in the
                                // services list and read as a
                                // generic "warning" pill rather
                                // than a positive endorsement,
                                // clashing with the all-purple
                                // selection states. Same low-chroma
                                // tinted background (10% brand) +
                                // deep brand text we use for
                                // selected categories and the
                                // cancellation policy banner.
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-[#7B2D8E]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#7B2D8E]">
                                  <Star className="h-2.5 w-2.5" />
                                  Popular
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-[12px] text-gray-500">
                              {tr.description}
                            </p>
                            <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                              {hasVariants ? (
                                <>
                                  <span className="font-semibold text-[#7B2D8E]">
                                    from {formatNaira(priceKobo)}
                                  </span>
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
                                    {tr.variants!.length} options
                                    <ChevronDown
                                      className={[
                                        'h-3 w-3 transition-transform',
                                        variantsOpen ? 'rotate-180' : '',
                                      ].join(' ')}
                                    />
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="inline-flex items-center gap-1 text-gray-500">
                                    <Clock className="h-3 w-3" />
                                    {duration} min
                                  </span>
                                  <span className="font-semibold text-[#7B2D8E]">
                                    {formatNaira(priceKobo)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Variant breakdown — one radio-style row per
                            bookable option so the customer picks the
                            exact session (1hr / 90min / couple, …) and
                            the frontdesk records precisely what was
                            booked. */}
                        {variantsOpen ? (
                          <ul
                            className="border-t border-gray-100 bg-gray-50/60"
                            role="radiogroup"
                            aria-label={`${tr.name} options`}
                          >
                            {tr.variants!.map((v) => {
                              const vDuration = parseDuration(v.duration)
                              const vSelected = selectedVariantId === v.id
                              return (
                                <li key={v.id}>
                                  <button
                                    type="button"
                                    role="radio"
                                    aria-checked={vSelected}
                                    onClick={() =>
                                      toggleVariant(
                                        category.slug,
                                        category.title,
                                        tr.id,
                                        tr.name,
                                        v,
                                      )
                                    }
                                    className={[
                                      'flex w-full items-center gap-3 py-2.5 pl-12 pr-4 text-left transition-colors',
                                      vSelected
                                        ? 'bg-[#7B2D8E]/5'
                                        : 'hover:bg-gray-100/70',
                                    ].join(' ')}
                                  >
                                    <span
                                      className={[
                                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                                        vSelected
                                          ? 'border-[#7B2D8E] bg-[#7B2D8E]'
                                          : 'border-gray-300 bg-white',
                                      ].join(' ')}
                                      aria-hidden="true"
                                    >
                                      {vSelected ? (
                                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                      ) : null}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span
                                        className={[
                                          'block text-[13px]',
                                          vSelected
                                            ? 'font-semibold text-gray-900'
                                            : 'font-medium text-gray-700',
                                        ].join(' ')}
                                      >
                                        {v.label}
                                      </span>
                                      <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-gray-500">
                                        <Clock className="h-3 w-3" />
                                        {vDuration} min
                                      </span>
                                    </span>
                                    <span
                                      className={[
                                        'shrink-0 text-[12px] font-semibold',
                                        vSelected
                                          ? 'text-[#7B2D8E]'
                                          : 'text-gray-700',
                                      ].join(' ')}
                                    >
                                      {formatNaira(v.price * 100)}
                                    </span>
                                  </button>
                                </li>
                              )
                            })}
                          </ul>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </section>
          )
        })}
      </div>

      {/* Sticky bottom summary so the user always sees what they've
          picked when scrolling through long category lists. */}
      {selected.length > 0 ? (
        <div className="sticky bottom-2 z-10 rounded-2xl border border-[#7B2D8E]/20 bg-white p-3 shadow-md">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-500">
                {selected.length} {selected.length === 1 ? 'service' : 'services'} • {totalDuration} min
              </p>
              <p className="mt-0.5 text-base font-bold text-gray-900">
                {formatNaira(totalKobo)}
              </p>
            </div>
            <span className="rounded-full bg-[#7B2D8E]/10 px-3 py-1 text-[11px] font-semibold text-[#7B2D8E]">
              Continue when ready
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
