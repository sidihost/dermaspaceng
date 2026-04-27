// ---------------------------------------------------------------------------
// components/blog/post-list.tsx
//
// Shared post list rendered inside both the admin and staff dashboards.
// Pure presentational — the parent server component supplies posts and
// the new/edit base path.
// ---------------------------------------------------------------------------

import Link from 'next/link'
import { Calendar, Eye, FileText, Plus, Star } from 'lucide-react'
import type { BlogPost } from '@/lib/blog'

interface Props {
  posts: BlogPost[]
  basePath: string // e.g. '/admin/blog' or '/staff/blog'
  canCreate: boolean
  /** When true (default) we render the inline page-level header
   *  + "New post" button. /admin/blog now provides its own header
   *  with stats chips, so it passes `showHeader={false}` to avoid
   *  rendering a duplicate "Blog posts" title. */
  showHeader?: boolean
}

function formatDate(d: Date | string | null) {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function PostList({ posts, basePath, canCreate, showHeader = true }: Props) {
  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Blog posts</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </p>
          </div>
          {canCreate && (
            <Link
              href={`${basePath}/new`}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#5A1D6A] transition-colors"
            >
              <Plus className="w-4 h-4" />
              New post
            </Link>
          )}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-gray-900 mb-1">No posts yet</h2>
          <p className="text-sm text-gray-500">
            {canCreate ? 'Tap "New post" to write your first article.' : 'You don\'t have any posts yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`${basePath}/${p.id}/edit`}
                  className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          p.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : p.status === 'archived'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.status}
                      </span>
                      {p.featured && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#7B2D8E]">
                          <Star className="w-3 h-3" />
                          Featured
                        </span>
                      )}
                      {p.category_name && (
                        <span className="text-[11px] text-gray-500">{p.category_name}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{p.title}</h3>
                    {p.excerpt && (
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{p.excerpt}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(p.published_at ?? p.updated_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {p.view_count} views
                      </span>
                      <span>by {p.author_name ?? 'Unknown'}</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
