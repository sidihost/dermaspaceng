'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronRight, ChevronLeft, CircleDot } from 'lucide-react'

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
    position: 'bottom'
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const calculatePosition = useCallback(() => {
    const step = tourSteps[currentStep]
    const element = document.querySelector(step.target)
    
    if (!element) {
      // Element not found - wait a bit and try again, or skip if still not found
      const retryTimeout = setTimeout(() => {
        const retryElement = document.querySelector(step.target)
        if (!retryElement) {
          if (currentStep < tourSteps.length - 1) {
            setCurrentStep(prev => prev + 1)
          } else {
            handleComplete()
          }
        } else {
          // Found on retry, recalculate
          calculatePosition()
        }
      }, 500)
      return () => clearTimeout(retryTimeout)
    }

    const rect = element.getBoundingClientRect()
    
    // Check if element is visible in viewport
    const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight
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
    const isMobile = window.innerWidth < 640
    const tooltipWidth = isMobile ? Math.min(300, window.innerWidth - 32) : 320
    const tooltipHeight = 200
    const padding = 12

    // On mobile, always position below or above
    const effectivePosition = isMobile ? 'bottom' : step.position

    switch (effectivePosition) {
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

    // Keep tooltip within viewport with proper padding
    const viewportPadding = isMobile ? 16 : 24
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - tooltipWidth - viewportPadding))
    top = Math.max(viewportPadding, top)
    
    // If tooltip goes below viewport, position it above the element
    if (top + tooltipHeight > window.innerHeight + scrollTop - viewportPadding) {
      top = rect.top + scrollTop - tooltipHeight - padding
    }

    setTooltipPosition({ top, left })
    
    // Scroll element into view if needed (only if not fully visible)
    if (!isInViewport) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
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

  if (!isVisible || !mounted) return null

  const step = tourSteps[currentStep]

  const tourContent = (
    <>
      {/* Overlay - allows clicking skip from anywhere */}
      <div 
        className="fixed inset-0 bg-black/60 z-[9998] transition-opacity duration-300 cursor-pointer" 
        onClick={handleSkip}
      />
      
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
        className="fixed z-[10000] w-[calc(100vw-32px)] sm:w-80 max-w-[320px] bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
        style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#7B2D8E] to-[#5A1D6A] px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CircleDot className="w-4 h-4 text-white/80" />
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

  // Use portal to render at document body level to avoid z-index issues
  return createPortal(tourContent, document.body)
}
