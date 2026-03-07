import React from 'react'
import { cn } from '@/lib/utils'

interface PremiumCardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'featured' | 'interactive'
  gradient?: boolean
  hoverEffect?: boolean
  onClick?: () => void
}

export function PremiumCard({
  children,
  className,
  variant = 'default',
  gradient = false,
  hoverEffect = true,
  onClick,
}: PremiumCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl transition-all duration-300',
        // Base styles
        'relative overflow-hidden',
        // Variant styles
        variant === 'default' && 'bg-white border border-gray-200',
        variant === 'featured' && 'bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A] text-white shadow-xl shadow-[#7B2D8E]/20',
        variant === 'interactive' && 'bg-white/95 backdrop-blur-sm border border-white/50',
        // Hover effects
        hoverEffect && variant !== 'featured' && 'hover:border-[#7B2D8E]/50 hover:shadow-lg hover:shadow-[#7B2D8E]/10',
        hoverEffect && variant === 'featured' && 'hover:shadow-2xl hover:shadow-[#7B2D8E]/40 hover:scale-105',
        // Interactive
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {gradient && variant === 'featured' && (
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#D4A853]/20 rounded-full blur-3xl -mr-10 -mt-10" />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
