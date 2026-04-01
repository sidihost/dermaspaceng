'use client'

import { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, CircleDot } from 'lucide-react'

interface TourStep {
  target: string
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right'
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="welcome"]',
    title: 'Welcome to Your Dashboard',
    description: 'This is your personalized space to manage appointments, track preferences, and access exclusive features.',
    position: 'bottom'
  },
  {
    target: '[data-tour="stats"]',
    title: 'Your Stats at a Glance',
    description: 'View your upcoming appointments, loyalty points, and membership status all in one place.',
    position: 'bottom'
  },
  {
    target: '[data-tour="sidebar"]',
    title: 'Navigation Menu',
    description: 'Easily navigate between overview, appointments, favorites, and preferences.',
    position: 'right'
  },
  {
    target: '[data-tour="derma-ai"]',
    title: 'Meet Derma AI',
    description: 'Your personal wellness assistant. Ask questions, get recommendations, or book appointments using voice or text.',
    position: 'left'
  }
]

export default function DashboardTour() {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('dermaspace_dashboard_tour_seen')
    if (!hasSeenTour) {
      setTimeout(() => setIsActive(true), 1000)
    }
  }, [])

  useEffect(() => {
    if (!isActive) return

    const step = tourSteps[currentStep]
    const element = document.querySelector(step.target)
    
    if (element) {
      const rect = element.getBoundingClientRect()
      setTargetRect(rect)
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isActive, currentStep])

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
    localStorage.setItem('dermaspace_dashboard_tour_seen', 'true')
    setIsActive(false)
  }

  const getTooltipStyle = () => {
    if (!targetRect) return {}
    
    const step = tourSteps[currentStep]
    const padding = 16
    
    switch (step.position) {
      case 'bottom':
        return {
          top: targetRect.bottom + padding,
          left: Math.max(16, targetRect.left + targetRect.width / 2 - 160)
        }
      case 'top':
        return {
          bottom: window.innerHeight - targetRect.top + padding,
          left: Math.max(16, targetRect.left + targetRect.width / 2 - 160)
        }
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2 - 80,
          right: window.innerWidth - targetRect.left + padding
        }
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2 - 80,
          left: targetRect.right + padding
        }
      default:
        return {}
    }
  }

  if (!isActive) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[60] pointer-events-none">
        <svg className="w-full h-full">
          <defs>
            <mask id="tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - 8}
                  y={targetRect.top - 8}
                  width={targetRect.width + 16}
                  height={targetRect.height + 16}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.6)"
            mask="url(#tour-mask)"
          />
        </svg>
      </div>

      {/* Target highlight */}
      {targetRect && (
        <div
          className="fixed z-[61] pointer-events-none rounded-xl ring-4 ring-[#7B2D8E] ring-opacity-50"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16
          }}
        >
          <div className="absolute inset-0 rounded-xl bg-[#7B2D8E]/10 animate-pulse" />
        </div>
      )}

      {/* Tooltip */}
      <div
        className="fixed z-[62] w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        style={getTooltipStyle()}
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
              <CircleDot className="w-5 h-5 text-[#7B2D8E]" />
            </div>
            <button
              onClick={completeTour}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {tourSteps[currentStep].title}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            {tourSteps[currentStep].description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {tourSteps.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentStep ? 'bg-[#7B2D8E]' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-1.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#5A1D6A] transition-colors"
              >
                {currentStep === tourSteps.length - 1 ? 'Got it!' : 'Next'}
                {currentStep < tourSteps.length - 1 && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
