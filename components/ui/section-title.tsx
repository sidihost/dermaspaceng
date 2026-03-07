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
          'text-sm font-medium uppercase tracking-wide mb-3',
          light ? 'text-white/80' : 'text-[#7B2D8E]'
        )}>
          {label}
        </p>
      )}
      <h2 className={cn(
        'text-2xl md:text-3xl font-bold mb-4',
        light ? 'text-white' : 'text-gray-900'
      )}>
        {title}
        {highlight && (
          <span className={light ? ' text-[#D4A853]' : ' text-[#7B2D8E]'}> {highlight}</span>
        )}
      </h2>
      {description && (
        <p className={cn(
          'text-base max-w-2xl',
          centered && 'mx-auto',
          light ? 'text-white/80' : 'text-gray-600'
        )}>
          {description}
        </p>
      )}
    </div>
  )
}
