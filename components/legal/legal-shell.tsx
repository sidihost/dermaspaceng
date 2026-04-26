"use client"

// ---------------------------------------------------------------------------
// LegalShell — shared chrome for /privacy and /terms.
//
// Editorial-style two-column layout: a sticky table of contents on the
// left (desktop) and the long-form policy body on the right. Mobile
// collapses to a single column with a horizontally scrollable section
// nav at the top so users can jump without scrolling through everything.
//
// Visual rules: brand purple (#7B2D8E) accents only, white background,
// gray neutral typography. No gradients, no sparkle/decorative icons —
// matches the rest of the public site.
// ---------------------------------------------------------------------------

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { ChevronRight, Mail, Phone, FileText } from "lucide-react"

export interface LegalSection {
  id: string
  title: string
  content: React.ReactNode
}

interface LegalShellProps {
  /** Page kicker — short pill above the H1, e.g. "Legal". */
  kicker: string
  /** Page H1, e.g. "Privacy Policy". */
  title: string
  /** Short subtitle under the title. */
  subtitle: string
  /** Last-updated date, displayed in the hero. */
  lastUpdated: string
  /** Effective-from date, optional. */
  effectiveDate?: string
  /** Short paragraph that opens the document above the first section. */
  intro: React.ReactNode
  /** All sections, rendered as <section id> for in-page anchors. */
  sections: LegalSection[]
}

export default function LegalShell({
  kicker,
  title,
  subtitle,
  lastUpdated,
  effectiveDate,
  intro,
  sections,
}: LegalShellProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "")
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  // Scroll-spy: highlight the table-of-contents item whose section is
  // currently in view. We use IntersectionObserver with a top-biased
  // rootMargin so the highlight flips as soon as a section's heading
  // crosses ~25% of the viewport height — feels like a native docs site.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) {
          const id = visible[0].target.getAttribute("id")
          if (id) setActiveId(id)
        }
      },
      {
        // Fire when the section's top crosses 25% from the top edge.
        rootMargin: "-25% 0px -65% 0px",
        threshold: [0, 0.25, 0.5, 1],
      },
    )

    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) {
        sectionRefs.current[s.id] = el
        observer.observe(el)
      }
    })
    return () => observer.disconnect()
  }, [sections])

  return (
    <div className="bg-white">
      {/* Hero — flat purple, no gradient */}
      <section className="bg-[#7B2D8E] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 mb-4">
            <FileText className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-widest">
              {kicker}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-balance">
            {title}
          </h1>
          <p className="mt-3 text-sm md:text-base text-white/80 max-w-2xl text-pretty leading-relaxed">
            {subtitle}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/70">
            <span>
              Last updated:{" "}
              <span className="text-white font-medium">{lastUpdated}</span>
            </span>
            {effectiveDate && (
              <span>
                Effective:{" "}
                <span className="text-white font-medium">{effectiveDate}</span>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Mobile section nav — horizontal scroll pill rail */}
      <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 px-4 py-3 min-w-max">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setActiveId(s.id)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                  activeId === s.id
                    ? "bg-[#7B2D8E] text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {s.title}
              </a>
            ))}
          </div>
        </div>
      </div>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
          {/* Desktop TOC */}
          <aside className="hidden lg:block">
            <nav className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
                On this page
              </p>
              <ul className="space-y-1">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className={`flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded-lg transition-colors ${
                        activeId === s.id
                          ? "bg-[#7B2D8E]/10 text-[#7B2D8E] font-semibold"
                          : "text-gray-600 hover:text-[#7B2D8E] hover:bg-gray-50"
                      }`}
                    >
                      <span className="line-clamp-1">{s.title}</span>
                      {activeId === s.id && (
                        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Body */}
          <article className="min-w-0">
            <div className="prose-legal text-gray-700">{intro}</div>

            <div className="mt-10 space-y-12">
              {sections.map((s, i) => (
                <section
                  key={s.id}
                  id={s.id}
                  className="scroll-mt-24"
                  aria-labelledby={`${s.id}-heading`}
                >
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="text-xs font-semibold text-[#7B2D8E] tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h2
                      id={`${s.id}-heading`}
                      className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight"
                    >
                      {s.title}
                    </h2>
                  </div>
                  <div className="prose-legal text-gray-700 text-[15px] leading-relaxed">
                    {s.content}
                  </div>
                </section>
              ))}
            </div>

            {/* Contact card — same shape as elsewhere on site */}
            <div className="mt-14 rounded-2xl bg-[#7B2D8E]/5 border border-[#7B2D8E]/10 p-5 sm:p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                Questions about this document?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Our team is happy to help clarify anything you read here.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="mailto:info@dermaspaceng.com"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#7B2D8E] bg-white border border-[#7B2D8E]/20 rounded-full px-4 py-2 hover:bg-[#7B2D8E] hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  info@dermaspaceng.com
                </a>
                <a
                  href="tel:+2349017972919"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#7B2D8E] bg-white border border-[#7B2D8E]/20 rounded-full px-4 py-2 hover:bg-[#7B2D8E] hover:text-white transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  +234 901 797 2919
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 text-sm font-medium text-white bg-[#7B2D8E] rounded-full px-4 py-2 hover:bg-[#5A1D6A] transition-colors"
                >
                  Contact us
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </article>
        </div>
      </section>

      <style jsx global>{`
        .prose-legal p {
          margin-top: 0;
          margin-bottom: 0.875rem;
        }
        .prose-legal p:last-child {
          margin-bottom: 0;
        }
        .prose-legal ul,
        .prose-legal ol {
          margin-top: 0.5rem;
          margin-bottom: 1rem;
          padding-left: 1.25rem;
        }
        .prose-legal ul {
          list-style: disc;
        }
        .prose-legal ol {
          list-style: decimal;
        }
        .prose-legal li {
          margin-bottom: 0.375rem;
        }
        .prose-legal h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .prose-legal a {
          color: #7b2d8e;
          font-weight: 500;
          text-decoration: underline;
          text-decoration-color: rgba(123, 45, 142, 0.35);
          text-underline-offset: 3px;
        }
        .prose-legal a:hover {
          text-decoration-color: #7b2d8e;
        }
        .prose-legal strong {
          font-weight: 600;
          color: #111827;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
