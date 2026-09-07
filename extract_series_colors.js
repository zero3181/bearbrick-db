// One-off backfill: for each series, sample its Basic "B" figure's photo
// (the whole-set representative) and average its non-background pixels to
// get that series' actual Basic color, stored on series.basicColor for the
// My Collection stats page's per-series badge ring color.
//
// Uploaded photos are normalized onto a flat near-white background
// (src/lib/normalizeImage.ts, rgb 249/250/251) before storage, but older or
// bulk-imported photos may not be - so pixels close to white OR black are
// both treated as background/shadow and excluded from the average, with a
// plain full-image average as a fallback if too few pixels remain.
const { PrismaClient } = require('@prisma/client')
const sharp = require('sharp')

const prisma = new PrismaClient()

const SAMPLE_SIZE = 60
const BG_DISTANCE_THRESHOLD = 40 // how close to white/black counts as "background"

function distance(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

function toHex(r, g, b) {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)))
  return '#' + [clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, '0')).join('')
}

async function extractColor(imageUrl) {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`fetch ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const { data, info } = await sharp(buf)
    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const channels = info.channels
  let sumR = 0, sumG = 0, sumB = 0, count = 0
  let allSumR = 0, allSumG = 0, allSumB = 0, allCount = 0

  for (let i = 0; i + channels <= data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    allSumR += r; allSumG += g; allSumB += b; allCount++

    const nearWhite = distance(r, g, b, 255, 255, 255) < BG_DISTANCE_THRESHOLD
    const nearBlack = distance(r, g, b, 0, 0, 0) < BG_DISTANCE_THRESHOLD
    if (nearWhite || nearBlack) continue
    sumR += r; sumG += g; sumB += b; count++
  }

  // If almost nothing survived the background mask (e.g. an all-white/black
  // figure, or a photo with a non-standard background this heuristic
  // doesn't catch), fall back to the plain full-image average.
  if (count < allCount * 0.05) {
    return toHex(allSumR / allCount, allSumG / allCount, allSumB / allCount)
  }
  return toHex(sumR / count, sumG / count, sumB / count)
}

async function main() {
  const seriesList = await prisma.series.findMany({ select: { id: true, number: true, name: true } })
  console.log(`Found ${seriesList.length} series`)

  let updated = 0
  let skipped = 0

  for (const s of seriesList) {
    const basicB = await prisma.bearbrick.findFirst({
      where: { seriesId: s.id, name: 'B', isSecret: false, categories: { name: 'Basic' } },
      select: { images: { select: { url: true, isPrimary: true } } },
    })
    const imageUrl = basicB?.images.find((img) => img.isPrimary)?.url ?? basicB?.images[0]?.url
    if (!imageUrl) {
      console.log(`[skip] Series ${s.number} (${s.name}) - no Basic "B" photo`)
      skipped++
      continue
    }

    try {
      const color = await extractColor(imageUrl)
      await prisma.series.update({ where: { id: s.id }, data: { basicColor: color } })
      console.log(`[ok]   Series ${s.number} (${s.name}) -> ${color}`)
      updated++
    } catch (error) {
      console.error(`[fail] Series ${s.number} (${s.name}):`, error.message)
      skipped++
    }
  }

  console.log(`\nDone. Updated ${updated}, skipped ${skipped}.`)
  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
