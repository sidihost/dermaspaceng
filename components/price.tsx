"use client"

import { useGeo } from '@/lib/geo-context'

interface PriceProps {
  amount: number // Price in NGN
  className?: string
  showOriginal?: boolean // Show original NGN price in parentheses
}

export function Price({ amount, className = '', showOriginal = false }: PriceProps) {
  const { formatPrice, country } = useGeo()
  
  const formattedPrice = formatPrice(amount)
  
  if (showOriginal && country.currency !== 'NGN') {
    return (
      <span className={className}>
        {formattedPrice}
        <span className="text-gray-400 text-sm ml-1">(₦{amount.toLocaleString()})</span>
      </span>
    )
  }
  
  return <span className={className}>{formattedPrice}</span>
}

// Server component compatible version - uses NGN by default
export function StaticPrice({ amount, className = '' }: { amount: number; className?: string }) {
  return <span className={className}>₦{amount.toLocaleString()}</span>
}
