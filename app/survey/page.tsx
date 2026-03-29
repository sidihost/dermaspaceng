"use client"

import { useState } from "react"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { CheckCircle, Send } from "lucide-react"

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
      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all text-sm
      ${selected 
        ? 'border-[#7B2D8E] bg-[#7B2D8E]/5' 
        : 'border-gray-200 hover:border-[#7B2D8E]/30'
      }
    `}>
      <div className={`
        w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0
        ${selected ? 'border-[#7B2D8E] bg-[#7B2D8E]' : 'border-gray-300'}
      `}>
        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
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

  const RatingButton = ({ value }: { value: number }) => (
    <button
      type="button"
      onClick={() => setSurveyData({ ...surveyData, overallRating: value })}
      className={`
        w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all
        ${value <= surveyData.overallRating 
          ? 'bg-[#7B2D8E] text-white' 
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }
      `}
    >
      {value}
    </button>
  )

  if (isSubmitted) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-white flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-3">
                Thank You!
              </h1>
              <p className="text-sm text-gray-600 mb-6">
                Your feedback helps us improve our services and provide you with an even better spa experience.
              </p>
              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors"
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
      <main className="min-h-screen bg-white">
        {/* Hero */}
        <section className="relative py-12 bg-[#7B2D8E]">
          <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
            <span className="inline-block px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-medium mb-4">
              Customer Feedback
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Share Your Experience
            </h1>
            <p className="text-sm text-white/80">
              Help us serve you better
            </p>
          </div>
        </section>

        {/* Survey Form */}
        <section className="py-8 -mt-4 relative z-20">
          <div className="max-w-xl mx-auto px-4">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#7B2D8E]">Step {currentStep} of {totalSteps}</span>
                <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#7B2D8E] transition-all duration-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              {/* Step 1 */}
              {currentStep === 1 && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-5">
                    Spa Environment
                  </h2>
                  
                  <div className="space-y-5">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        The esthetics of the SPA was appropriate and pleasing.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
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
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        The ambiance of the treatment area was fresh, clean and scented.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
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

              {/* Step 2 */}
              {currentStep === 2 && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-5">
                    SPA Staff
                  </h2>
                  
                  <div className="space-y-5">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        The front desk was friendly and courteous.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
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
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        The SPA staff was prompt, professional and friendly.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
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

              {/* Step 3 */}
              {currentStep === 3 && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-5">
                    General Experience
                  </h2>
                  
                  <div className="space-y-5">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        Was your appointment delayed? How long?
                      </p>
                      <div className="grid grid-cols-2 gap-2">
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
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        Rate your overall experience (1-5)
                      </p>
                      <div className="flex items-center justify-center gap-3 py-3">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <RatingButton key={value} value={value} />
                        ))}
                      </div>
                      {surveyData.overallRating > 0 && (
                        <p className="text-center text-xs text-gray-500 mt-2">
                          {surveyData.overallRating === 5 && "Excellent!"}
                          {surveyData.overallRating === 4 && "Very Good"}
                          {surveyData.overallRating === 3 && "Good"}
                          {surveyData.overallRating === 2 && "Fair"}
                          {surveyData.overallRating === 1 && "Poor"}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        Do you plan on visiting the SPA again?
                      </p>
                      <div className="grid grid-cols-3 gap-2">
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

              {/* Step 4 */}
              {currentStep === 4 && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-5">
                    Additional Comments
                  </h2>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      Please share any additional feedback.
                    </p>
                    <textarea
                      rows={5}
                      value={surveyData.comments}
                      onChange={(e) => setSurveyData({ ...surveyData, comments: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20 outline-none transition-all resize-none text-sm"
                      placeholder="Tell us about your experience..."
                    />
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100">
                <button
                  onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                  disabled={currentStep === 1}
                  className="px-5 py-2.5 text-sm text-gray-600 font-medium rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {currentStep < totalSteps ? (
                  <button
                    onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
                    className="px-6 py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Submit
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
