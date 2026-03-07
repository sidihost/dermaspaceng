import { LucideIcon } from 'lucide-react'

interface SectionHeaderProps {
  badge?: string
  badgeIcon?: LucideIcon
  title: string
  highlight?: string
  description?: string
  centered?: boolean
  light?: boolean
}

export default function SectionHeader({ 
  badge, 
  badgeIcon: BadgeIcon,
  title, 
  highlight, 
  description, 
  centered = true,
  light = false 
}: SectionHeaderProps) {
  return (
    <div className={`mb-10 md:mb-12 ${centered ? 'text-center' : ''}`}>
      {badge && (
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 ${
          light 
            ? 'bg-white/10 border border-white/20' 
            : 'bg-[#7B2D8E]/10'
        }`}>
          {BadgeIcon && (
            <BadgeIcon className={`w-3.5 h-3.5 ${light ? 'text-[#D4A853]' : 'text-[#7B2D8E]'}`} />
          )}
          <span className={`text-xs font-semibold uppercase tracking-widest ${
            light ? 'text-[#D4A853]' : 'text-[#7B2D8E]'
          }`}>
            {badge}
          </span>
        </div>
      )}
      
      <h2 className={`text-2xl md:text-3xl font-bold ${light ? 'text-white' : 'text-gray-900'}`}>
        {title}
        {highlight && (
          <span className={`${light ? 'text-[#D4A853]' : 'text-[#7B2D8E]'}`}> {highlight}</span>
        )}
      </h2>
      
      {description && (
        <p className={`mt-3 max-w-2xl text-sm md:text-base ${
          light ? 'text-white/80' : 'text-gray-600'
        } ${centered ? 'mx-auto' : ''}`}>
          {description}
        </p>
      )}
      
      {/* Decorative divider */}
      <div className={`flex items-center gap-2 mt-5 ${centered ? 'justify-center' : ''}`}>
        <div className={`w-8 h-0.5 rounded-full ${light ? 'bg-[#D4A853]/50' : 'bg-[#7B2D8E]/30'}`} />
        <div className={`w-2 h-2 rounded-full ${light ? 'bg-[#D4A853]' : 'bg-[#7B2D8E]'}`} />
        <div className={`w-8 h-0.5 rounded-full ${light ? 'bg-[#D4A853]/50' : 'bg-[#7B2D8E]/30'}`} />
      </div>
    </div>
  )
}
