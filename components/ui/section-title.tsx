import { cn } from '@/lib/utils'

interface SectionTitleProps {
  label?: string
  title: string
  highlight?: string
  description?: string
  centered?: boolean
  light?: boolean
}

export function SectionTitle({
  label,
  title,
  highlight,
  description,
  centered = true,
  light = false,
}: SectionTitleProps) {
  return (
    <div className={cn('mb-12', centered && 'text-center')}>
      {label && (
        <p className={cn(
          'text-xs font-semibold uppercase tracking-widest mb-4',
          light ? 'text-white/80' : 'text-[#7B2D8E]'
        )}>
          {label}
        </p>
      )}
      <h2 className={cn(
        'text-2xl md:text-3xl font-bold',
        light ? 'text-white' : 'text-gray-900'
      )}>
        {title}
        {highlight && (
          <span className={light ? ' text-[#D4A853]' : ' text-[#7B2D8E]'}> {highlight}</span>
        )}
      </h2>
      
      {/* Underline */}
      <div className={cn('flex items-center gap-2 mt-4', centered ? 'justify-center' : '')}>
        <div className={cn('w-8 h-0.5', light ? 'bg-[#D4A853]' : 'bg-[#D4A853]')} />
        <div className={cn('w-2 h-0.5', light ? 'bg-[#D4A853]/50' : 'bg-[#7B2D8E]/30')} />
      </div>

      {description && (
        <p className={cn(
          'text-sm mt-4 max-w-xl',
          centered && 'mx-auto',
          light ? 'text-white/80' : 'text-gray-600'
        )}>
          {description}
        </p>
      )}
    </div>
  )
}
