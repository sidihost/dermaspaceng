/**
 * Pure label helper for recommendation rails so logged-in members see
 * "Picked for you" while guests see "Recommended for you".
 */
export function getRecommendationsEyebrow(isLoggedIn: boolean): string {
  return isLoggedIn ? 'Picked for you' : 'Recommended for you'
}
