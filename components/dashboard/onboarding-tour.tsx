'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'

interface TourStep {
  target: string
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right'
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="overview-tab"]',
    title: 'Your Dashboard',
    description: 'This is your personal space. See your upcoming appointments, preferences, and activity at a glance.',
    position: 'bottom'
  },
  {
    target: '[data-tour="appointments-tab"]',
    title: 'Appointments',
    description: 'View and manage all your bookings. Never miss a spa day!',
    position: 'bottom'
  },
  {
    target: '[data-tour="preferences-tab"]',
    title: 'Your Preferences',
    description: 'Tell us about your skin type and concerns so we can personalize your experience.',
    position: 'bottom'
  },
  {
    target: '[data-tour="book-button"]',
    title: 'Book a Service',
    description: 'Ready for your glow-up? Book your next appointment with just a tap.',
    position: 'left'
  },
  {
    target: '[data-tour="ai-assistant"]',
    title: 'Meet DermaAI',
    description: 'Your personal skincare assistant. Ask anything about treatments, products, or get personalized recommendations.',
    position: 'top'
  }
]

interface OnboardingTourProps {
  userId: string
  onComplete: () => void
}

export default function OnboardingTour({ userId, onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const [isVisible, setIsVisible] = useState(false)
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({})

  const calculatePosition = useCallback(() => {
    const step = tourSteps[currentStep]
    const element = document.querySelector(step.target)
    
    if (!element) {
      // Skip to next step if element not found
      if (currentStep < tourSteps.length - 1) {
        setCurrentStep(prev => prev + 1)
      } else {
        handleComplete()
      }
      return
    }

    const rect = element.getBoundingClientRect()
    const scrollTop = window.scrollY
    const scrollLeft = window.scrollX
    
    // Set highlight position
    setHighlightStyle({
      top: rect.top + scrollTop - 8,
      left: rect.left + scrollLeft - 8,
      width: rect.width + 16,
      height: rect.height + 16,
    })

    // Calculate tooltip position based on step.position
    let top = 0
    let left = 0
    const tooltipWidth = 320
    const tooltipHeight = 180
    const padding = 16

    switch (step.position) {
      case 'bottom':
        top = rect.bottom + scrollTop + padding
        left = rect.left + scrollLeft + (rect.width / 2) - (tooltipWidth / 2)
        break
      case 'top':
        top = rect.top + scrollTop - tooltipHeight - padding
        left = rect.left + scrollLeft + (rect.width / 2) - (tooltipWidth / 2)
        break
      case 'left':
        top = rect.top + scrollTop + (rect.height / 2) - (tooltipHeight / 2)
        left = rect.left + scrollLeft - tooltipWidth - padding
        break
      case 'right':
        top = rect.top + scrollTop + (rect.height / 2) - (tooltipHeight / 2)
        left = rect.right + scrollLeft + padding
        break
    }

    // Keep tooltip within viewport
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16))
    top = Math.max(16, top)

    setTooltipPosition({ top, left })
    
    // Scroll element into view if needed
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentStep])

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      setIsVisible(true)
      calculatePosition()
    }, 500)

    return () => clearTimeout(timer)
  }, [calculatePosition])

  useEffect(() => {
    calculatePosition()
    
    window.addEventListener('resize', calculatePosition)
    window.addEventListener('scroll', calculatePosition)
    
    return () => {
      window.removeEventListener('resize', calculatePosition)
      window.removeEventListener('scroll', calculatePosition)
    }
  }, [currentStep, calculatePosition])

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = () => {
    localStorage.setItem(`dermaspace-tour-${userId}`, 'completed')
    onComplete()
  }

  const handleSkip = () => {
    localStorage.setItem(`dermaspace-tour-${userId}`, 'skipped')
    onComplete()
  }

  if (!isVisible) return null

  const step = tourSteps[currentStep]

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 z-[9998] transition-opacity duration-300" />
      
      {/* Highlight around target element */}
      <div 
        className="fixed z-[9999] rounded-2xl transition-all duration-300 pointer-events-none"
        style={{
          ...highlightStyle,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 20px rgba(123, 45, 142, 0.5)',
          border: '2px solid #7B2D8E',
        }}
      />

      {/* Tooltip */}
      <div 
        className="fixed z-[10000] w-80 bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
        style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#7B2D8E] to-[#5A1D6A] px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-white/80" />
              <span className="text-white/80 text-sm font-medium">
                Step {currentStep + 1} of {tourSteps.length}
              </span>
            </div>
            <button 
              onClick={handleSkip}
              className="text-white/60 hover:text-white transition-colors"
              aria-label="Skip tour"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <h3 className="text-white text-lg font-bold mt-2">{step.title}</h3>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
          
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {tourSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? 'bg-[#7B2D8E] w-6' 
                    : index < currentStep 
                      ? 'bg-[#7B2D8E]/50' 
                      : 'bg-gray-200'
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-5">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-[#7B2D8E] hover:bg-[#7B2D8E]/5 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-white bg-[#7B2D8E] hover:bg-[#5A1D6A] rounded-lg transition-colors"
              >
                {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
                {currentStep < tourSteps.length - 1 && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
