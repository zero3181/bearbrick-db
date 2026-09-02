import { put } from '@vercel/blob'
import sharp from 'sharp'
import { prisma } from '@/lib/prisma'

const TARGET_W = 900
const TARGET_H = 1200
const MARGIN_RATIO = 0.88
const BG = { r: 249, g: 250, b: 251 } // matches Tailwind bg-gray-50

// Trims each photo's background down to the figure, then pads back out to a
// fixed frame at a fixed margin, so photos shot at very different zoom
// levels end up showing the figure at roughly the same size on screen.
async function normalize(buf: Buffer): Promise<Buffer> {
  const trimmed = await sharp(buf).trim({ threshold: 15 }).toBuffer({ resolveWithObject: true })
  const scale = Math.min(
    (TARGET_W * MARGIN_RATIO) / trimmed.info.width,
    (TARGET_H * MARGIN_RATIO) / trimmed.info.height
  )
  const w = Math.round(trimmed.info.width * scale)
  const h = Math.round(trimmed.info.height * scale)
  return sharp(trimmed.data)
    .resize(w, h)
    .extend({
      top: Math.floor((TARGET_H - h) / 2),
      bottom: Math.ceil((TARGET_H - h) / 2),
      left: Math.floor((TARGET_W - w) / 2),
      right: Math.ceil((TARGET_W - w) / 2),
      background: BG,
    })
    .jpeg({ quality: 90 })
    .toBuffer()
}

// Fire-and-forget from a route handler via next/server's `after()`, so the
// upload response returns immediately with the original image while this
// swaps in a normalized version once it's ready.
export async function normalizeImageInBackground(imageId: string, sourceUrl: string, bearbrickId: string) {
  try {
    const res = await fetch(sourceUrl)
    if (!res.ok) throw new Error(`fetch ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const normalized = await normalize(buf)
    const blob = await put(`bearbrick-${bearbrickId}-normalized-${Date.now()}.jpg`, normalized, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    await prisma.bearbrickImage.update({ where: { id: imageId }, data: { url: blob.url } })
  } catch (error) {
    console.error(`Failed to normalize image ${imageId}:`, error)
  }
}
