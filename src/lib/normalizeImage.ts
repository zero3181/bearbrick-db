import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { prisma } from '@/lib/prisma'
import { r2, R2_BUCKET, r2PublicUrl } from '@/lib/r2'

const TARGET_W = 900
const TARGET_H = 1200
const MARGIN_RATIO = 0.88
const BG = { r: 249, g: 250, b: 251 } // matches Tailwind bg-gray-50

// Trims a photo's background down to the figure, then pads back out to a
// fixed frame at a fixed margin, so photos shot at very different zoom
// levels end up showing the figure at roughly the same size on screen.
async function trimAndCenter(buf: Buffer): Promise<Buffer> {
  // Some uploads are transparent PNGs saved under a .jpg name. JPEG has no
  // alpha channel, so without flattening first, sharp silently composites
  // any transparent pixels onto black when it encodes the final JPEG -
  // flatten explicitly onto our own background color instead, both before
  // trim (so trim sees our color, not stale transparent pixel data) and
  // again right before the JPEG encode (in case .extend() or resize left
  // any transparency behind).
  const trimmed = await sharp(buf)
    .flatten({ background: BG })
    .trim({ threshold: 15 })
    .toBuffer({ resolveWithObject: true })
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
    .flatten({ background: BG })
    .jpeg({ quality: 90 })
    .toBuffer()
}

// A real photo's background is rarely a perfectly flat color (soft studio
// gradients, a faint drop shadow) - sharp's trim() compares against a single
// reference pixel, so it can crop one edge tighter than the opposite one and
// leave the figure off-center. Running the same trim+center pass again on
// the *result* fixes this: that image's background is a color we chose
// ourselves and painted on with .extend(), so it's perfectly flat and the
// second trim finds the true, symmetric bounding box.
async function normalize(buf: Buffer): Promise<Buffer> {
  const once = await trimAndCenter(buf)
  return trimAndCenter(once)
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
    // A new key, not an overwrite of the original: Cloudflare's edge cache
    // would otherwise keep serving the pre-normalized bytes under the old
    // URL for up to its cache lifetime. The original key is deleted right
    // after, so it doesn't linger as an orphan either way.
    const key = `bearbrick-${bearbrickId}-normalized-${Date.now()}.jpg`
    await r2.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: normalized, ContentType: 'image/jpeg' }))
    await prisma.bearbrickImage.update({ where: { id: imageId }, data: { url: r2PublicUrl(key) } })

    const oldKey = new URL(sourceUrl).pathname.replace(/^\//, '')
    if (oldKey !== key) {
      await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldKey }))
    }
  } catch (error) {
    console.error(`Failed to normalize image ${imageId}:`, error)
  }
}
