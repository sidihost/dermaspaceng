export interface SkinTip {
  title: string
  description: string
  recommendedServices: string[]
}

export const skinTypeTips: Record<string, SkinTip> = {
  Oily: {
    title: "Oily Skin Care Tips",
    description: "Focus on deep cleansing and oil control treatments to balance your skin's natural sebum production.",
    recommendedServices: ["Deep Cleansing Facial", "Chemical Peel", "Microdermabrasion", "Clay Mask Treatment"]
  },
  Dry: {
    title: "Dry Skin Care Tips", 
    description: "Hydration is key! Look for treatments that restore moisture and strengthen your skin barrier.",
    recommendedServices: ["Hydrating Facial", "Hyaluronic Acid Treatment", "Moisturizing Body Wrap", "Oxygen Facial"]
  },
  Combination: {
    title: "Combination Skin Care Tips",
    description: "Balance is everything. Treatments that address both oily and dry areas will work best for you.",
    recommendedServices: ["Balancing Facial", "Customized Chemical Peel", "LED Light Therapy", "Enzyme Facial"]
  },
  Normal: {
    title: "Normal Skin Care Tips",
    description: "Maintain your healthy skin with regular treatments that keep it glowing and prevent aging.",
    recommendedServices: ["Signature Facial", "Microdermabrasion", "LED Light Therapy", "Vitamin C Treatment"]
  },
  Sensitive: {
    title: "Sensitive Skin Care Tips",
    description: "Gentle, soothing treatments are best. Avoid harsh chemicals and opt for calming ingredients.",
    recommendedServices: ["Calming Facial", "LED Light Therapy", "Oxygen Facial", "Gentle Enzyme Treatment"]
  }
}

export const concernTips: Record<string, SkinTip> = {
  Acne: {
    title: "Acne Treatment Tips",
    description: "Target breakouts with deep cleansing and antibacterial treatments for clearer skin.",
    recommendedServices: ["Acne Facial", "Chemical Peel", "LED Blue Light Therapy", "Extraction Facial"]
  },
  Aging: {
    title: "Anti-Aging Tips",
    description: "Combat fine lines and wrinkles with collagen-boosting and firming treatments.",
    recommendedServices: ["Anti-Aging Facial", "Microneedling", "Radiofrequency Treatment", "Laser Rejuvenation"]
  },
  Hyperpigmentation: {
    title: "Hyperpigmentation Tips",
    description: "Even out your skin tone with brightening treatments and sun protection.",
    recommendedServices: ["Brightening Facial", "Chemical Peel", "Laser Treatment", "Vitamin C Infusion"]
  },
  "Dark Spots": {
    title: "Dark Spot Treatment Tips",
    description: "Target stubborn dark spots with specialized treatments that promote cell turnover.",
    recommendedServices: ["Brightening Peel", "Laser Spot Treatment", "IPL Therapy", "Pigment Correction Facial"]
  },
  Dryness: {
    title: "Hydration Tips",
    description: "Replenish moisture levels with intensive hydrating treatments.",
    recommendedServices: ["Hydrating Facial", "Hyaluronic Acid Treatment", "Moisture Infusion", "Body Hydration Wrap"]
  },
  "Fine Lines": {
    title: "Fine Line Treatment Tips",
    description: "Smooth out fine lines with treatments that boost collagen and plump the skin.",
    recommendedServices: ["Microneedling", "Dermal Fillers Consultation", "Radiofrequency Tightening", "Peptide Facial"]
  },
  Wrinkles: {
    title: "Wrinkle Reduction Tips",
    description: "Target deeper wrinkles with advanced treatments that restore skin elasticity.",
    recommendedServices: ["Laser Resurfacing", "Microneedling", "Botox Consultation", "HIFU Treatment"]
  },
  "Uneven Tone": {
    title: "Skin Tone Evening Tips",
    description: "Achieve a more uniform complexion with treatments that target discoloration.",
    recommendedServices: ["Even Tone Facial", "Chemical Peel", "IPL Photofacial", "Vitamin C Treatment"]
  },
  Redness: {
    title: "Redness Reduction Tips",
    description: "Calm inflammation and reduce redness with soothing, anti-inflammatory treatments.",
    recommendedServices: ["Calming Facial", "LED Red Light Therapy", "Laser Vein Treatment", "Rosacea Facial"]
  },
  "Large Pores": {
    title: "Pore Minimizing Tips",
    description: "Refine skin texture and minimize the appearance of pores.",
    recommendedServices: ["Pore Refining Facial", "Microdermabrasion", "Chemical Peel", "Laser Pore Treatment"]
  }
}

export const laserTips: Record<string, SkinTip> = {
  "Hair Removal": {
    title: "Laser Hair Removal Tips",
    description: "Achieve smooth, hair-free skin with our advanced laser technology.",
    recommendedServices: ["Full Body Laser", "Facial Laser Hair Removal", "Brazilian Laser", "Underarm Laser"]
  },
  "Skin Rejuvenation": {
    title: "Laser Skin Rejuvenation Tips",
    description: "Restore youthful radiance with non-invasive laser treatments.",
    recommendedServices: ["Laser Facial Rejuvenation", "Fractional Laser", "CO2 Laser", "Nd:YAG Laser"]
  },
  "Pigmentation": {
    title: "Laser Pigmentation Treatment Tips",
    description: "Target stubborn pigmentation with precision laser technology.",
    recommendedServices: ["Q-Switch Laser", "IPL Treatment", "Laser Spot Removal", "Pigment Laser"]
  },
  "Acne Scars": {
    title: "Laser Acne Scar Treatment Tips",
    description: "Smooth out acne scars and improve skin texture with laser resurfacing.",
    recommendedServices: ["Fractional CO2 Laser", "Erbium Laser", "Picosecond Laser", "Microneedling RF"]
  }
}

export function getPersonalizedTips(skinType?: string, concerns?: string[]): SkinTip[] {
  const tips: SkinTip[] = []
  
  // Add skin type tip
  if (skinType && skinTypeTips[skinType]) {
    tips.push(skinTypeTips[skinType])
  }
  
  // Add concern tips (max 2)
  if (concerns && concerns.length > 0) {
    for (const concern of concerns.slice(0, 2)) {
      if (concernTips[concern]) {
        tips.push(concernTips[concern])
      }
    }
  }
  
  return tips
}

export function getPersonalizedLaserTips(concerns?: string[]): SkinTip[] {
  const tips: SkinTip[] = []
  
  // Map concerns to laser tips
  const concernToLaser: Record<string, string> = {
    "Hyperpigmentation": "Pigmentation",
    "Dark Spots": "Pigmentation",
    "Acne": "Acne Scars",
    "Aging": "Skin Rejuvenation",
    "Fine Lines": "Skin Rejuvenation",
    "Wrinkles": "Skin Rejuvenation"
  }
  
  if (concerns) {
    const addedTypes = new Set<string>()
    for (const concern of concerns) {
      const laserType = concernToLaser[concern]
      if (laserType && laserTips[laserType] && !addedTypes.has(laserType)) {
        tips.push(laserTips[laserType])
        addedTypes.add(laserType)
      }
    }
  }
  
  // Always suggest hair removal as a popular option
  if (tips.length === 0) {
    tips.push(laserTips["Hair Removal"])
  }
  
  return tips.slice(0, 2)
}
