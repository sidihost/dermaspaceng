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
    <div className={`mb-12 md:mb-16 ${centered ? 'text-center' : ''}`}>
      {badge && (
        <div className={`inline-flex items-center px-4 py-2 rounded-full mb-5 ${
          light 
            ? 'bg-white/10 border border-white/20' 
            : 'bg-[#7B2D8E]/10'
        }`}>
          <span className={`text-sm font-semibold uppercase tracking-widest ${
            light ? 'text-white' : 'text-[#7B2D8E]'
          }`}>
            {badge}
          </span>
        </div>
      )}
      
      <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold ${light ? 'text-white' : 'text-gray-900'}`}>
        {title}
        {highlight && (
          <span className="text-[#7B2D8E]"> {highlight}</span>
        )}
      </h2>
      
      {description && (
        <p className={`mt-4 max-w-2xl text-lg md:text-xl leading-relaxed ${
          light ? 'text-white/80' : 'text-gray-600'
        } ${centered ? 'mx-auto' : ''}`}>
          {description}
        </p>
      )}
      
      {/* Decorative curve */}
      <div className={`mt-6 ${centered ? 'flex justify-center' : ''}`}>
        <svg width="120" height="20" viewBox="0 0 120 20" fill="none" className="overflow-visible">
          <path 
            d="M0 10 Q30 0 60 10 T120 10" 
            stroke={light ? 'rgba(255,255,255,0.3)' : '#7B2D8E'} 
            strokeWidth="2" 
            fill="none"
            strokeLinecap="round"
            opacity={light ? 1 : 0.4}
          />
          <circle cx="60" cy="10" r="4" fill={light ? 'white' : '#7B2D8E'} />
        </svg>
      </div>
    </div>
  )
}
