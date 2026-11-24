// One-off: fill in placeholder rarity percentages for Series 53, modeled on
// Series 52's per-category rates (no official odds exist yet - the set is
// unannounced). Safe to re-run; it just overwrites by name each time.
//
// Usage: npx tsx scripts/set-series-53-rarity.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const RARITY: Record<string, number> = {
  'BE@RBRICK': 1.62,
  'Pusheen': 4.16,
  'My Little Pony': 4.16,
  'Quztopia': 4.16,
  'JAIRO': 4.16,
  'Buddha Brand': 4.16,
  'Charlie Morningstar': 4.16,
  'Onimusha': 4.16,
  'Baki': 4.16,
  'Judge Dredd': 4.16,
  'Clayface': 4.16,
  'Travis and Sigrid': 7.29,
  'Mocha': 5.72,
  'Granny Square': 5.72,
  'Azerbaijan': 5.72,
}

async function main() {
  const items = await prisma.bearbrick.findMany({ where: { series: { number: 53 } } })
  for (const item of items) {
    const rarity = RARITY[item.name]
    if (rarity === undefined) {
      console.warn(`No rarity mapped for "${item.name}", skipping.`)
      continue
    }
    await prisma.bearbrick.update({ where: { id: item.id }, data: { rarityPercentage: rarity } })
    console.log(`${item.name.padEnd(24)} -> ${rarity}%`)
  }
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
