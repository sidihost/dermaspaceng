'use client'

import { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, Sparkles, MapPin, Gift, Calendar, MessageCircle, User } from 'lucide-react'

interface TourStep {
  target: string
  title: string
  description: string
  icon: React.ReactNode
  position: 'top' | 'bottom' | 'left' | 'right'
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="hero"]',
    title: 'Welcome to Dermaspace!',
    description: 'Your journey to skin confidence starts here. Explore our premium spa services designed to rejuvenate your body and mind.',
    icon: <Sparkles className="w-5 h-5" />,
    position: 'bottom'
  },
  {
    target: '[data-tour="services"]',
    title: 'Our Services',
    description: 'Browse our wide range of treatments including facials, massages, body treatments, and advanced skin therapies.',
    icon: <MapPin className="w-5 h-5" />,
    position: 'top'
  },
  {
    target: '[data-tour="packages"]',
    title: 'Spa Packages',
    description: 'Save more with our curated spa packages. Perfect for a full day of pampering or as a gift for someone special.',
    icon: <Gift className="w-5 h-5" />,
    position: 'top'
  },
  {
    target: '[data-tour="booking"]',
    title: 'Easy Booking',
    description: 'Book your appointment online in just a few clicks. Choose your preferred date, time, and location.',
    icon: <Calendar className="w-5 h-5" />,
    position: 'top'
  },
  {
    target: '[data-tour="chatbot"]',
    title: 'AI Assistant',
    description: 'Need help? Our AI assistant Derma is available 24/7 to answer questions, give skincare advice, and help you book appointments.',
    icon: <MessageCircle className="w-5 h-5" />,
    position: 'left'
  },
  {
    target: '[data-tour="account"]',
    title: 'Your Account',
    description: 'Create an account to track appointments, save preferences, and receive personalized recommendations.',
    icon: <User className="w-5 h-5" />,
    position: 'bottom'
  }
]

export default function TourGuide() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [hasSeenTour, setHasSeenTour] = useState(true)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    const seen = localStorage.getItem('dermaspace_tour_seen')
    if (!seen) {
      setHasSeenTour(false)
      setTimeout(() => setIsOpen(true), 2000)
    }
  }, [])

  useEffect(() => {
    if (isOpen && tourSteps[currentStep]) {
      const target = document.querySelector(tourSteps[currentStep].target)
      if (target) {
        const rect = target.getBoundingClientRect()
        const step = tourSteps[currentStep]
        
        let top = 0
        let left = 0
        
        switch (step.position) {
          case 'bottom':
            top = rect.bottom + 16
            left = rect.left + rect.width / 2
            break
          case 'top':
            top = rect.top - 16
            left = rect.left + rect.width / 2
            break
          case 'left':
            top = rect.top + rect.height / 2
            left = rect.left - 16
            break
          case 'right':
            top = rect.top + rect.height / 2
            left = rect.right + 16
            break
        }
        
        setTooltipPosition({ top, left })
        
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [isOpen, currentStep])

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      completeTour()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const completeTour = () => {
    setIsOpen(false)
    localStorage.setItem('dermaspace_tour_seen', 'true')
    setHasSeenTour(true)
  }

  const startTour = () => {
    setCurrentStep(0)
    setIsOpen(true)
  }

  if (hasSeenTour && !isOpen) {
    return (
      <button
        onClick={startTour}
        className="fixed bottom-24 md:bottom-6 left-4 z-40 px-4 py-2 bg-white text-[#7B2D8E] text-sm font-medium rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 border border-[#7B2D8E]/20"
      >
        <Sparkles className="w-4 h-4" />
        Take a Tour
      </button>
    )
  }

  if (!isOpen) return null

  const step = tourSteps[currentStep]

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[100]" onClick={completeTour} />
      
      {/* Spotlight */}
      <div 
        className="fixed z-[101] pointer-events-none"
        style={{
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
          borderRadius: '12px'
        }}
      />

      {/* Tooltip */}
      <div
        className={`fixed z-[102] w-80 bg-white rounded-2xl shadow-2xl p-5 transform -translate-x-1/2 ${
          step.position === 'top' ? '-translate-y-full' : ''
        } ${step.position === 'left' ? '-translate-x-full -translate-y-1/2' : ''}`}
        style={{ 
          top: tooltipPosition.top,
          left: tooltipPosition.left
        }}
      >
        {/* Progress */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E]">
              {step.icon}
            </div>
            <span className="text-xs text-gray-500">
              Step {currentStep + 1} of {tourSteps.length}
            </span>
          </div>
          <button
            onClick={completeTour}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
        <p className="text-sm text-gray-600 mb-4">{step.description}</p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {tourSteps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentStep ? 'bg-[#7B2D8E] w-4' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={completeTour}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip Tour
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-2 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#5A1D6A] transition-colors"
            >
              {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
