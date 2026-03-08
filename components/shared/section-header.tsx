interface SectionHeaderProps {
  badge?: string
  title: string
  highlight?: string
  description?: string
  centered?: boolean
  light?: boolean
}

export default function SectionHeader({ 
  badge, 
  title, 
  highlight, 
  description, 
  centered = true,
  light = false 
}: SectionHeaderProps) {
  return (
    <div className={`mb-10 ${centered ? 'text-center' : ''}`}>
      {badge && (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 ${
          light 
            ? 'bg-white/10 border border-white/20' 
            : 'bg-[#7B2D8E]/10'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
          <span className={`text-xs font-medium uppercase tracking-wide ${
            light ? 'text-white' : 'text-[#7B2D8E]'
          }`}>
            {badge}
          </span>
        </div>
      )}
      
      <h2 className={`text-headline font-semibold ${light ? 'text-white' : 'text-gray-900'}`}>
        {title}
        {highlight && (
          <span className={light ? ' text-white/90' : ' text-[#7B2D8E]'}> {highlight}</span>
        )}
      </h2>
      
      {description && (
        <p className={`mt-3 max-w-xl text-body ${
          light ? 'text-white/70' : 'text-gray-500'
        } ${centered ? 'mx-auto' : ''}`}>
          {description}
        </p>
      )}
    </div>
  )
}
