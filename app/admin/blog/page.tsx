// ---------------------------------------------------------------------------
// /admin/blog
//
// Admin landing page for blog management. Shows ALL posts (admins see
// everyone's), with quick stats and a link to manage staff blog
// permissions.
//
// Layout overhaul (this version):
//   * The previous page was a single right-aligned permissions link
//     above the post list — on phones the link sat alone in the
//     corner with no context, no metric chips, and the post list
//     header (h1 "Blog posts") felt heavy at 24px on a small screen.
//   * Now we lead with a compact, brand-consistent header that
//     mirrors the rest of the admin (32px brand tile + truncating
//     subtitle). Stat chips ride alongside on desktop; on phones
//     they wrap underneath without crowding.
//   * Every action (New post, Manage permissions) is accessible from
//     the same header so admins don't have to scroll past the post
//     list to manage staff.
// ---------------------------------------------------------------------------

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, Eye, FileText, Plus, Star, Users } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAllPostsForAuthor, getBlogPermissions } from '@/lib/blog'
import { PostList } from '@/components/blog/post-list'

export const metadata = { title: 'Blog | Admin' }

export default async function AdminBlogPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/admin')

  const [posts, perms] = await Promise.all([
    getAllPostsForAuthor(user),
    getBlogPermissions(user),
  ])

  // Lightweight in-memory aggregation — these are the same posts the
  // PostList below renders, so this avoids a second round-trip just
  // to count totals.
  const totals = {
    all: posts.length,
    published: posts.filter((p) => p.status === 'published').length,
    drafts: posts.filter((p) => p.status === 'draft').length,
    featured: posts.filter((p) => p.featured).length,
    views: posts.reduce((sum, p) => sum + (p.view_count ?? 0), 0),
  }

  return (
    <div className="space-y-5">
      {/* Header — compact on mobile, comfortable on desktop. Mirrors
          the visual language of /admin/users and /admin/settings:
          32px brand tile, 18px title, truncating one-line subtitle,
          right-aligned action cluster. */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-[#7B2D8E]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-none tracking-tight">
              Blog
            </h1>
            <p className="text-xs text-gray-500 mt-1 truncate">
              {totals.all} {totals.all === 1 ? 'post' : 'posts'} ·{' '}
              {totals.published} published · {totals.drafts} drafts
            </p>
          </div>
        </div>

        {/* Action cluster — wraps cleanly on small screens. The
            permissions link is no longer hidden in a top-right
            corner: it shares the same row as New post on desktop
            and stacks underneath on phones via flex-wrap. */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/blog/permissions"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E] transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            Staff permissions
          </Link>
          {perms.can_create && (
            <Link
              href="/admin/blog/new"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New post
            </Link>
          )}
        </div>
      </header>

      {/* Stat chips — same calm, tabular-numerals look as the rest of
          the admin console. Two columns on phones, four on desktop so
          everything stays touchable. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <StatCard label="Total posts" value={totals.all} icon={FileText} />
        <StatCard label="Published" value={totals.published} icon={BookOpen} />
        <StatCard label="Featured" value={totals.featured} icon={Star} />
        <StatCard
          label="Total views"
          value={totals.views}
          icon={Eye}
        />
      </div>

      {/* Post list — unchanged content, but PostList renders its own
          smaller header now that this page provides the page-level
          chrome. We keep PostList shared with /staff/blog so we
          don't fork the row layout. */}
      <PostList
        posts={posts}
        basePath="/admin/blog"
        canCreate={perms.can_create}
        showHeader={false}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatCard — tiny inline component so the chip grid above stays
// readable. Same chip pattern used on /admin/users/[userId] but
// trimmed of the `accent` boolean we don't need here.
// ---------------------------------------------------------------------------
function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 flex items-center gap-3">
      <span className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-[#7B2D8E]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold text-gray-500 uppercase tracking-wide truncate">
          {label}
        </p>
        <p className="mt-0.5 text-base sm:text-lg font-semibold text-gray-900 tabular-nums leading-tight">
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  )
}
