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
