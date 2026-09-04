// The Bearbrick collector community reserves "Super Secret" for the rarest
// chase tier specifically - one figure per two cartons (1/192), distinct from
// the broader "Secret" bucket that also covers more common chase figures
// (1/24, 1/48, 1/96...). Our Secret category groups every unlisted chase
// figure together regardless of tier, so the badge color is what actually
// tells the two apart, keyed off the sourced rarityPercentage.
const SUPER_SECRET_RARITY = 100 / 192

export function isSuperSecretRarity(rarityPercentage: number | null | undefined): boolean {
  return rarityPercentage != null && Math.abs(rarityPercentage - SUPER_SECRET_RARITY) < 0.05
}

// Displays a percentage as an approximate fraction with a denominator that's
// a multiple of 24 (a case is 24 pieces), since that's the unit collectors
// actually think in ("1 in 48", "3 in 192"...) rather than a raw percentage.
export function toFraction(pct: number): string {
  for (let k = 1; k <= 8; k++) {
    const denom = 24 * k
    const numer = (pct / 100) * denom
    if (Math.abs(numer - Math.round(numer)) < 0.05) {
      return `${Math.round(numer)}/${denom}`
    }
  }
  const denom = 192
  const numer = Math.round((pct / 100) * denom)
  return `${numer}/${denom}`
}
