// One-off: create Series 53 (Anime Comic Con x BE@RBRICK 30th anniversary set)
// and its 15 bearbricks, uploading each local desktop photo to R2 as the
// primary image. Run once; re-running would create duplicates since nothing
// here is upserted by name.
//
// Usage: npx tsx scripts/add-series-53.ts

import fs from 'fs'
import { PrismaClient } from '@prisma/client'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const prisma = new PrismaClient()
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})
const R2_BUCKET = process.env.R2_BUCKET_NAME!
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!

const OWNER_EMAIL = 'andyjin@gmail.com'
const DESKTOP = `${process.env.HOME}/Desktop`

const ITEMS: { file: string; name: string; category: string; isSecret?: boolean }[] = [
  { file: 'sseries53_bear1.jpg.webp', name: 'BE@RBRICK', category: 'Basic' },
  { file: 'sseries53_bear2.jpg.webp', name: 'Pusheen', category: 'Cute' },
  { file: 'sseries53_bear3.jpg.webp', name: 'Quztopia', category: 'Artist' },
  { file: 'sseries53_bear4.jpg.webp', name: 'Charlie Morningstar', category: 'Horror' },
  { file: 'sseries53_bear5.jpg.webp', name: 'JAIRO', category: 'Artist' },
  { file: 'sseries53_bear6.jpg.webp', name: 'Buddha Brand', category: 'Artist' },
  { file: 'sseries53_bear7.jpg.webp', name: 'Onimusha', category: 'SF' },
  { file: 'sseries53_bear8.jpg.webp', name: 'Baki', category: 'Hero' },
  { file: 'sseries53_bear9.jpg.webp', name: 'Travis and Sigrid', category: 'Animal' },
  { file: 'sseries53_bear10.jpg.webp', name: 'My Little Pony', category: 'Cute' },
  { file: 'sseries53_bear12.jpg.webp', name: 'Mocha', category: 'Jelly Bean' },
  { file: 'sseries53_bear13.jpg.webp', name: 'Granny Square', category: 'Pattern' },
  { file: 'sseries53_bear14.jpg.webp', name: 'Azerbaijan', category: 'Flag' },
  { file: 'sseries53_bear15.jpg.webp', name: 'Judge Dredd', category: 'Hero' },
  { file: 'sseries53_bear16.jpg.webp', name: 'Clayface', category: 'Hero' },
]

async function main() {
  const owner = await prisma.user.findFirst({ where: { email: OWNER_EMAIL } })
  if (!owner) throw new Error(`No user found for ${OWNER_EMAIL}`)

  const categories = await prisma.categories.findMany()
  const categoryIdByName = new Map(categories.map((c) => [c.name, c.id]))
  for (const item of ITEMS) {
    if (!categoryIdByName.has(item.category)) throw new Error(`Unknown category: ${item.category}`)
  }

  let series = await prisma.series.findFirst({ where: { number: 53 } })
  if (!series) {
    series = await prisma.series.create({
      data: {
        id: crypto.randomUUID(),
        number: 53,
        name: 'Series 53',
        season: 'Winter',
        releaseYear: 2026,
        theme: 'Anime Comic Con x BE@RBRICK 30th Anniversary',
        basicColor: '#1b2a6b',
        updatedAt: new Date(),
      },
    })
    console.log('Created series:', series.name, series.id)
  } else {
    console.log('Series 53 already exists, reusing:', series.id)
  }

  for (const item of ITEMS) {
    const filePath = `${DESKTOP}/${item.file}`
    const bytes = fs.readFileSync(filePath)

    const bearbrick = await prisma.bearbrick.create({
      data: {
        id: crypto.randomUUID(),
        name: item.name,
        sizePercentage: 100,
        isSecret: item.isSecret ?? false,
        seriesId: series.id,
        categoryId: categoryIdByName.get(item.category)!,
        createdById: owner.id,
        updatedAt: new Date(),
      },
    })

    const key = `bearbrick-${bearbrick.id}-${Date.now()}.webp`
    await r2.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: bytes, ContentType: 'image/webp' }))
    const url = `${R2_PUBLIC_URL}/${key}`

    await prisma.bearbrickImage.create({
      data: {
        url,
        isPrimary: true,
        bearbrickId: bearbrick.id,
        uploadedById: owner.id,
      },
    })

    console.log(`[${item.category}] ${item.name} -> ${url}`)
  }

  console.log(`\nDone: ${ITEMS.length} bearbricks added to Series 53.`)
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
