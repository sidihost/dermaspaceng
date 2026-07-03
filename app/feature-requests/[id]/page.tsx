import type { Metadata } from 'next'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { sql } from '@/lib/db'
import FeatureRequestDetailClient from './detail-client'

export const dynamic = 'force-dynamic'

// Build a helpful, idea-specific <title>/description when we can, so a
// shared link reads nicely. Falls back to the generic board copy.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  try {
    const rows = await sql`
      SELECT title, description FROM feature_requests WHERE id = ${id} LIMIT 1
    `
    if (rows.length > 0) {
      return {
        title: `${rows[0].title} · Feature Requests · Dermaspace`,
        description: String(rows[0].description).slice(0, 160),
      }
    }
  } catch {
    /* fall through to default */
  }
  return { title: 'Feature Request · Dermaspace' }
}

export default async function FeatureRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <>
      <Header />
      <main>
        <FeatureRequestDetailClient id={id} />
      </main>
      <Footer />
    </>
  )
}
