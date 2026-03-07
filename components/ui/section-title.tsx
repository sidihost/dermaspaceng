'use client'

import { cn } from '@/lib/utils'

interface SectionTitleProps {
  label?: string
  title: string
  highlight?: string
  description?: string
  align?: 'left' | 'center'
  className?: string
}

export function SectionTitle({ 
  label,
  title, 
  highlight,
  description,
  align = 'center',
  className 
}: SectionTitleProps) {
  return (
    <div className={cn(
      'max-w-3xl mb-12',
      align === 'center' ? 'mx-auto text-center' : '',
      className
    )}>
      {/* Label with decorative lines */}
      {label && (
        <div className={cn(
          'flex items-center gap-3 mb-4',
          align === 'center' ? 'justify-center' : ''
        )}>
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#7B2D8E]/50" />
          <span className="text-[10px] font-semibold text-[#7B2D8E] uppercase tracking-[0.2em]">
            {label}
          </span>
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#7B2D8E]/50" />
        </div>
      )}
      
      {/* Title */}
      <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 text-balance leading-tight">
        {title}{' '}
        {highlight && (
          <span className="relative">
            <span className="relative z-10 text-[#7B2D8E]">{highlight}</span>
            <svg 
              className="absolute -bottom-1 left-0 w-full h-2 text-[#7B2D8E]/20" 
              viewBox="0 0 100 8" 
              preserveAspectRatio="none"
            >
              <path 
                d="M0 7 Q 25 0, 50 5 T 100 3" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </span>
        )}
      </h2>
      
      {/* Description */}
      {description && (
        <p className="mt-4 text-sm text-gray-600 text-pretty leading-relaxed">
          {description}
        </p>
      )}
      
      {/* Decorative bottom element */}
      <div className={cn(
        'mt-6 flex items-center gap-1',
        align === 'center' ? 'justify-center' : ''
      )}>
        <div className="w-1 h-1 rounded-full bg-[#7B2D8E]/30" />
        <div className="w-2 h-2 rounded-full bg-[#7B2D8E]/50" />
        <div className="w-8 h-1 rounded-full bg-gradient-to-r from-[#7B2D8E] to-[#C41E8E]" />
        <div className="w-2 h-2 rounded-full bg-[#7B2D8E]/50" />
        <div className="w-1 h-1 rounded-full bg-[#7B2D8E]/30" />
      </div>
    </div>
  )
}
