"use client"

import { useState } from "react"
import Image from "next/image"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { CheckCircle, Star, Send } from "lucide-react"

type SurveyData = {
  aesthetics: string
  ambiance: string
  frontDesk: string
  staffProfessional: string
  appointmentDelay: string
  overallRating: number
  visitAgain: string
  comments: string
}

export default function SurveyPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [surveyData, setSurveyData] = useState<SurveyData>({
    aesthetics: "",
    ambiance: "",
    frontDesk: "",
    staffProfessional: "",
    appointmentDelay: "",
    overallRating: 0,
    visitAgain: "",
    comments: ""
  })

  const totalSteps = 4
  const progress = (currentStep / totalSteps) * 100

  const handleSubmit = async () => {
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitted(true)
  }

  const RadioOption = ({ 
    name, 
    value, 
    label, 
    selected 
  }: { 
    name: keyof SurveyData
    value: string
    label: string
    selected: boolean 
  }) => (
    <label className={`
      flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300
      ${selected 
        ? 'border-[var(--derma-purple)] bg-[var(--derma-purple)]/5' 
        : 'border-gray-100 hover:border-[var(--derma-purple)]/30'
      }
    `}>
      <div className={`
        w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
        ${selected ? 'border-[var(--derma-purple)] bg-[var(--derma-purple)]' : 'border-gray-300'}
      `}>
        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={(e) => setSurveyData({ ...surveyData, [name]: e.target.value })}
        className="sr-only"
      />
      <span className="text-gray-700">{label}</span>
    </label>
  )

  if (isSubmitted) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[var(--derma-cream)] flex items-center justify-center px-4">
          <div className="max-w-lg w-full text-center">
            <div className="bg-white rounded-3xl p-10">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-[var(--derma-purple-dark)] mb-4">
                Thank You for Your Feedback!
              </h1>
              <p className="text-gray-600 mb-8">
                Your feedback helps us improve our services and provide you with an even better spa experience.
              </p>
              <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-8 h-8 ${star <= surveyData.overallRating ? 'text-[var(--derma-gold)] fill-[var(--derma-gold)]' : 'text-gray-200'}`}
                  />
                ))}
              </div>
              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[var(--derma-purple)] to-[var(--derma-magenta)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                Back to Home
              </a>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--derma-cream)]">
        {/* Hero */}
        <section className="relative pt-32 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--derma-purple)] via-[var(--derma-purple-dark)] to-[var(--derma-magenta)]" />
          <div className="absolute inset-0">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/515516d9-test-bg-shape.png-hMXaTGVS1uqILJSiItT2vqXG3NJ3Z3.webp"
              alt=""
              width={200}
              height={200}
              className="absolute top-20 right-20 opacity-20 w-auto h-auto"
            />
          </div>
          
          <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
            <span className="inline-block px-4 py-2 rounded-full bg-white/10 text-white/90 text-sm font-medium mb-6">
              Customer Feedback
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Share Your <span className="text-[var(--derma-gold)]">Experience</span>
            </h1>
            <p className="text-lg text-white/80">
              Help us serve you better by sharing your feedback
            </p>
          </div>
        </section>

        {/* Survey Form */}
        <section className="py-12 -mt-6 relative z-20">
          <div className="max-w-2xl mx-auto px-4">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--derma-purple)]">Step {currentStep} of {totalSteps}</span>
                <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[var(--derma-purple)] to-[var(--derma-magenta)] transition-all duration-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 md:p-10">
              {/* Step 1: Spa Environment */}
              {currentStep === 1 && (
                <div className="animate-fade-in">
                  <h2 className="text-xl font-bold text-[var(--derma-purple-dark)] mb-6">
                    Spa Environment
                  </h2>
                  
                  <div className="space-y-6">
                    <div>
                      <p className="font-medium text-gray-700 mb-3">
                        The esthetics of the SPA was appropriate and pleasing. <span className="text-red-500">*</span>
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {["Strongly Agree", "Agree", "Disagree", "Strongly Disagree"].map((option) => (
                          <RadioOption
                            key={option}
                            name="aesthetics"
                            value={option}
                            label={option}
                            selected={surveyData.aesthetics === option}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="font-medium text-gray-700 mb-3">
                        The ambiance of the treatment area was fresh, clean and scented. <span className="text-red-500">*</span>
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {["Strongly Agree", "Agree", "Disagree", "Strongly Disagree"].map((option) => (
                          <RadioOption
                            key={option}
                            name="ambiance"
                            value={option}
                            label={option}
                            selected={surveyData.ambiance === option}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Staff */}
              {currentStep === 2 && (
                <div className="animate-fade-in">
                  <h2 className="text-xl font-bold text-[var(--derma-purple-dark)] mb-6">
                    SPA Staff
                  </h2>
                  
                  <div className="space-y-6">
                    <div>
                      <p className="font-medium text-gray-700 mb-3">
                        The front desk was friendly and courteous. <span className="text-red-500">*</span>
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {["Strongly Agree", "Agree", "Disagree", "Strongly Disagree"].map((option) => (
                          <RadioOption
                            key={option}
                            name="frontDesk"
                            value={option}
                            label={option}
                            selected={surveyData.frontDesk === option}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="font-medium text-gray-700 mb-3">
                        The SPA staff was prompt, professional and friendly. <span className="text-red-500">*</span>
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {["Strongly Agree", "Agree", "Disagree", "Strongly Disagree"].map((option) => (
                          <RadioOption
                            key={option}
                            name="staffProfessional"
                            value={option}
                            label={option}
                            selected={surveyData.staffProfessional === option}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: General */}
              {currentStep === 3 && (
                <div className="animate-fade-in">
                  <h2 className="text-xl font-bold text-[var(--derma-purple-dark)] mb-6">
                    General Experience
                  </h2>
                  
                  <div className="space-y-6">
                    <div>
                      <p className="font-medium text-gray-700 mb-3">
                        Was your appointment delayed? How long? <span className="text-red-500">*</span>
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {["5 mins", "10 mins", "15 mins", "30 mins"].map((option) => (
                          <RadioOption
                            key={option}
                            name="appointmentDelay"
                            value={option}
                            label={option}
                            selected={surveyData.appointmentDelay === option}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="font-medium text-gray-700 mb-3">
                        On a scale of 1-5, rate your overall experience. <span className="text-red-500">*</span>
                      </p>
                      <div className="flex items-center justify-center gap-2 py-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setSurveyData({ ...surveyData, overallRating: star })}
                            className="p-2 transition-transform hover:scale-110"
                          >
                            <Star
                              className={`w-10 h-10 transition-colors ${
                                star <= surveyData.overallRating 
                                  ? 'text-[var(--derma-gold)] fill-[var(--derma-gold)]' 
                                  : 'text-gray-200 hover:text-[var(--derma-gold)]/50'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <p className="text-center text-sm text-gray-500">
                        {surveyData.overallRating === 5 && "Excellent!"}
                        {surveyData.overallRating === 4 && "Very Good"}
                        {surveyData.overallRating === 3 && "Good"}
                        {surveyData.overallRating === 2 && "Fair"}
                        {surveyData.overallRating === 1 && "Poor"}
                      </p>
                    </div>

                    <div>
                      <p className="font-medium text-gray-700 mb-3">
                        Do you plan on visiting the SPA again? <span className="text-red-500">*</span>
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {["Yes", "No", "Not sure"].map((option) => (
                          <RadioOption
                            key={option}
                            name="visitAgain"
                            value={option}
                            label={option}
                            selected={surveyData.visitAgain === option}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Comments */}
              {currentStep === 4 && (
                <div className="animate-fade-in">
                  <h2 className="text-xl font-bold text-[var(--derma-purple-dark)] mb-6">
                    Additional Comments
                  </h2>
                  
                  <div>
                    <p className="font-medium text-gray-700 mb-3">
                      Please share any additional feedback. <span className="text-red-500">*</span>
                    </p>
                    <textarea
                      rows={6}
                      value={surveyData.comments}
                      onChange={(e) => setSurveyData({ ...surveyData, comments: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--derma-purple)] focus:ring-2 focus:ring-[var(--derma-purple)]/20 outline-none transition-all resize-none"
                      placeholder="Tell us about your experience, what you liked, and how we can improve..."
                    />
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                <button
                  onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                  disabled={currentStep === 1}
                  className="px-6 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {currentStep < totalSteps ? (
                  <button
                    onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
                    className="px-8 py-3 bg-gradient-to-r from-[var(--derma-purple)] to-[var(--derma-magenta)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[var(--derma-purple)] to-[var(--derma-magenta)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
                  >
                    <Send className="w-5 h-5" />
                    Submit Feedback
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
