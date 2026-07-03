import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Derma AI for Business | Rebrandable AI Assistant',
  description:
    'License the Derma AI assistant for your company. Rebrand it, train it on your own data, and embed it on your website in one line — all on our AI credits. ₦35,000/year.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://dermaspaceng.com/derma-ai-saas' },
}

export default function SaasLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground font-sans">{children}</div>
}
