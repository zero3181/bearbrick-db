// One-off migration: copies every BearbrickImage still hosted on Vercel Blob
// over to Cloudflare R2, and repoints the DB row at the new URL. Idempotent -
// rows already on R2_PUBLIC_URL are skipped, so it's safe to re-run after a
// partial failure. The old Vercel Blob files are left in place on purpose;
// clean those up manually once the migration is confirmed good.
//
// Usage:
//   npx tsx scripts/migrate-images-to-r2.ts            # migrate everything
//   npx tsx scripts/migrate-images-to-r2.ts --limit 5   # dry-run a few first

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

const CONCURRENCY = 5

function contentTypeFor(url: string) {
  if (url.endsWith('.png')) return 'image/png'
  if (url.endsWith('.gif')) return 'image/gif'
  if (url.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}

async function migrateOne(image: { id: string; url: string }) {
  const res = await fetch(image.url)
  if (!res.ok) throw new Error(`fetch ${res.status} for ${image.url}`)
  const bytes = Buffer.from(await res.arrayBuffer())

  const key = new URL(image.url).pathname.replace(/^\//, '')
  await r2.send(
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: bytes, ContentType: contentTypeFor(image.url) })
  )

  const newUrl = `${R2_PUBLIC_URL}/${key}`
  await prisma.bearbrickImage.update({ where: { id: image.id }, data: { url: newUrl } })
  return newUrl
}

async function main() {
  const limitArg = process.argv.indexOf('--limit')
  const limit = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : undefined

  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
    console.error('Missing R2_ACCOUNT_ID / R2_BUCKET_NAME / R2_PUBLIC_URL in the environment.')
    process.exit(1)
  }

  const pending = await prisma.bearbrickImage.findMany({
    where: { url: { not: { startsWith: R2_PUBLIC_URL } } },
    select: { id: true, url: true },
    take: limit,
  })

  console.log(`${pending.length} image(s) to migrate${limit ? ` (--limit ${limit})` : ''}.`)

  let done = 0
  let failed = 0
  const failures: { id: string; url: string; error: string }[] = []

  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const batch = pending.slice(i, i + CONCURRENCY)
    await Promise.all(
      batch.map(async (image) => {
        try {
          const newUrl = await migrateOne(image)
          done++
          console.log(`[${done + failed}/${pending.length}] ${image.url} -> ${newUrl}`)
        } catch (error) {
          failed++
          const message = error instanceof Error ? error.message : String(error)
          failures.push({ id: image.id, url: image.url, error: message })
          console.error(`[${done + failed}/${pending.length}] FAILED ${image.url}: ${message}`)
        }
      })
    )
  }

  console.log(`\nDone: ${done} migrated, ${failed} failed.`)
  if (failures.length > 0) {
    console.log('Failed rows (re-run the script to retry these):')
    for (const f of failures) console.log(`  ${f.id}  ${f.url}  (${f.error})`)
  }

  await prisma.$disconnect()
}

main()
