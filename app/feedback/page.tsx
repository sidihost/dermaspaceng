'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { MessageSquare, ThumbsUp, ThumbsDown, Meh, Send, Check, ArrowRight } from 'lucide-react'

const feedbackCategories = [
  { id: 'service', label: 'Service Quality', description: 'Share your treatment experience' },
  { id: 'staff', label: 'Staff & Support', description: 'Feedback about our team' },
  { id: 'facility', label: 'Facility & Ambiance', description: 'Environment and cleanliness' },
  { id: 'booking', label: 'Booking Experience', description: 'Website and appointment process' },
  { id: 'suggestion', label: 'Suggestions', description: 'Ideas for improvement' },
  { id: 'complaint', label: 'Report an Issue', description: 'Let us know what went wrong' },
]

const experienceOptions = [
  { id: 'positive', label: 'Positive', icon: ThumbsUp, color: 'text-green-600 bg-green-50 border-green-200' },
  { id: 'neutral', label: 'Neutral', icon: Meh, color: 'text-gray-600 bg-gray-50 border-gray-200' },
  { id: 'negative', label: 'Negative', icon: ThumbsDown, color: 'text-red-500 bg-red-50 border-red-200' },
]

export default function FeedbackPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [experience, setExperience] = useState('')
  const [rating, setRating] = useState(0)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  const canProceed = () => {
    if (step === 1) return selectedCategory !== ''
    if (step === 2) return experience !== '' && rating > 0
    if (step === 3) return message.trim().length > 10
    return true
  }

  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-[#FDFBF9]">
        <Header />
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-[#7B2D8E]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-[#7B2D8E]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Thank You for Your Feedback</h1>
            <p className="text-gray-600 mb-8">
              Your feedback helps us improve our services. We appreciate you taking the time to share your experience with us.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors"
              >
                Back to Home
              </button>
              <button
                onClick={() => {
                  setIsSubmitted(false)
                  setStep(1)
                  setSelectedCategory('')
                  setExperience('')
                  setRating(0)
                  setMessage('')
                }}
                className="px-6 py-3 border-2 border-[#7B2D8E] text-[#7B2D8E] text-sm font-semibold rounded-full hover:bg-[#7B2D8E]/5 transition-colors"
              >
                Submit Another
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FDFBF9]">
      <Header />
      
      {/* Hero */}
      <section className="bg-[#7B2D8E] py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
            <MessageSquare className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-medium text-white uppercase tracking-widest">Feedback</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
            We Value Your <span className="text-white/80">Opinion</span>
          </h1>
          <p className="text-sm text-white/70 max-w-md mx-auto">
            Help us serve you better by sharing your experience
          </p>
        </div>
      </section>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  step >= s ? 'bg-[#7B2D8E] text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-16 sm:w-24 h-1 mx-2 rounded-full transition-colors ${
                    step > s ? 'bg-[#7B2D8E]' : 'bg-gray-100'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] sm:text-xs text-gray-500">
            <span>Category</span>
            <span>Rating</span>
            <span>Details</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <form onSubmit={handleSubmit}>
          {/* Step 1: Category */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-1">What would you like to share?</h2>
                <p className="text-sm text-gray-500">Select a category that best fits your feedback</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {feedbackCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedCategory === cat.id
                        ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${
                      selectedCategory === cat.id ? 'text-[#7B2D8E]' : 'text-gray-900'
                    }`}>{cat.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Rating */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-1">How was your experience?</h2>
                <p className="text-sm text-gray-500">Rate your overall satisfaction</p>
              </div>
              
              {/* Experience Type */}
              <div className="flex justify-center gap-3">
                {experienceOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setExperience(opt.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all min-w-[100px] ${
                      experience === opt.id
                        ? opt.color + ' border-current'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <opt.icon className={`w-6 h-6 ${experience === opt.id ? '' : 'text-gray-400'}`} />
                    <span className={`text-xs font-medium ${experience === opt.id ? '' : 'text-gray-600'}`}>{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Number Rating */}
              <div>
                <p className="text-sm text-gray-700 text-center mb-3">Rate from 1 to 10</p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      className={`w-10 h-10 rounded-full text-sm font-semibold transition-all ${
                        rating === n
                          ? 'bg-[#7B2D8E] text-white scale-110'
                          : rating > 0 && n <= rating
                          ? 'bg-[#7B2D8E]/20 text-[#7B2D8E]'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Details */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Tell us more</h2>
                <p className="text-sm text-gray-500">Share the details of your feedback</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Name (Optional)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Email (Optional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Your Feedback *</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please share the details of your experience..."
                  rows={5}
                  required
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] resize-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">{message.length} characters (minimum 10)</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Back
              </button>
            ) : (
              <div />
            )}
            
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canProceed() || isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Feedback
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>

      <Footer />
    </main>
  )
}
