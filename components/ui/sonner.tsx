'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'group toast bg-white border-[#7B2D8E]/20 shadow-lg shadow-[#7B2D8E]/5',
          title: 'text-gray-900 font-semibold',
          description: 'text-gray-600',
          success: 'bg-white border-[#7B2D8E]/30 [&>svg]:text-[#7B2D8E]',
          error: 'bg-white border-red-200 [&>svg]:text-red-500',
          warning: 'bg-white border-amber-200 [&>svg]:text-amber-500',
          info: 'bg-white border-[#7B2D8E]/20 [&>svg]:text-[#7B2D8E]',
          actionButton: 'bg-[#7B2D8E] text-white hover:bg-[#5A1D6A]',
          cancelButton: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
        },
      }}
      style={
        {
          '--normal-bg': '#ffffff',
          '--normal-text': '#1a1a1a',
          '--normal-border': 'rgba(123, 45, 142, 0.2)',
          '--success-bg': '#ffffff',
          '--success-text': '#1a1a1a',
          '--success-border': 'rgba(123, 45, 142, 0.3)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
