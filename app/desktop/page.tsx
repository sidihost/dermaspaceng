import type { Metadata } from 'next'
import DesktopContent from './desktop-content'

export const metadata: Metadata = {
  title: 'Dermaspace for Desktop | Native Apps for Windows, macOS, Linux',
  description:
    'Get the Dermaspace native desktop app — book treatments, manage your wallet, chat with our team, and pick up notifications without ever opening a browser tab. Free download for Windows, macOS, and Linux.',
  alternates: { canonical: '/desktop' },
  openGraph: {
    title: 'Dermaspace for Desktop',
    description:
      'A native, lightweight Dermaspace experience for Windows, macOS, and Linux.',
    url: '/desktop',
    siteName: 'Dermaspace',
    type: 'website',
    images: [
      {
        url: '/images/desktop-app-hero.jpg',
        width: 1600,
        height: 1000,
        alt: 'Dermaspace desktop app on a MacBook',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dermaspace for Desktop',
    description:
      'A native, lightweight Dermaspace experience for Windows, macOS, and Linux.',
    images: ['/images/desktop-app-hero.jpg'],
  },
}

export default function DesktopPage() {
  return <DesktopContent />
}
