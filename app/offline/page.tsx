import { Metadata } from 'next'
import OfflineContent from './offline-content'

export const metadata: Metadata = {
  title: 'Offline | Dermaspace',
  description: 'You are currently offline',
}

export default function OfflinePage() {
  return <OfflineContent />
}
