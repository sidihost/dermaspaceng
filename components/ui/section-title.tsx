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
      'max-w-3xl mb-16',
      align === 'center' ? 'mx-auto text-center' : '',
      className
    )}>
      {/* Label with decorative lines */}
      {label && (
        <div className={cn(
          'flex items-center gap-4 mb-6',
          align === 'center' ? 'justify-center' : ''
        )}>
          <div className="h-px w-12 bg-[#D4A853]" />
          <span className="text-sm font-semibold text-[#7B2D8E] uppercase tracking-[0.15em]">
            {label}
          </span>
          <div className="h-px w-12 bg-[#D4A853]" />
        </div>
      )}
      
      {/* Title */}
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 text-balance leading-tight">
        {title}{' '}
        {highlight && (
          <span className="relative inline-block">
            <span className="relative z-10 text-[#7B2D8E]">{highlight}</span>
            <svg 
              className="absolute -bottom-2 left-0 w-full h-3 text-[#D4A853]/40" 
              viewBox="0 0 100 12" 
              preserveAspectRatio="none"
            >
              <path 
                d="M0 10 Q 25 2, 50 8 T 100 6" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </span>
        )}
      </h2>
      
      {/* Description */}
      {description && (
        <p className="mt-6 text-lg text-gray-600 text-pretty leading-relaxed max-w-2xl mx-auto">
          {description}
        </p>
      )}
      
      {/* Decorative bottom element */}
      <div className={cn(
        'mt-8 flex items-center gap-1.5',
        align === 'center' ? 'justify-center' : ''
      )}>
        <div className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]/30" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#7B2D8E]/50" />
        <div className="w-12 h-1.5 rounded-full bg-[#7B2D8E]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#7B2D8E]/50" />
        <div className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]/30" />
      </div>
    </div>
  )
}
