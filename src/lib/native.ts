'use client'

import { Capacitor } from '@capacitor/core'

/**
 * Thin wrappers over the Capacitor plugins. Every one of these is a no-op in a
 * browser, so callers never have to check the platform - and the plugin code
 * is only pulled in when it's actually going to run, keeping it out of the
 * website's bundle.
 */

export const isNative = () => Capacitor.isNativePlatform()

/** A light tap - for toggling something on or off. */
export async function tapFeedback() {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // Haptics are a nicety; a device without a taptic engine just misses out.
  }
}

/** A short buzz - for confirming something was saved. */
export async function successFeedback() {
  if (!isNative()) return
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType.Success })
  } catch {
    // ignored, as above
  }
}

/**
 * Opens the OS share sheet. Falls back to the Web Share API in a browser that
 * has one, and reports back whether anything was shown so the caller can
 * offer copying the link instead.
 */
export async function shareLink({ title, text, url }: { title: string; text?: string; url: string }) {
  if (isNative()) {
    try {
      const { Share } = await import('@capacitor/share')
      await Share.share({ title, text, url, dialogTitle: title })
      return true
    } catch (error) {
      // Backing out of the sheet is a success as far as the caller cares.
      // Anything else - most likely a build whose native side predates this
      // plugin - has to fall through, or the button does nothing at all.
      if (isDismissal(error)) return true
      console.warn('Native share unavailable, falling back:', error)
    }
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return true
    } catch (error) {
      if (isDismissal(error)) return true
      console.warn('Web share failed, falling back:', error)
    }
  }
  return false
}

/** Tells "the user closed the sheet" apart from "sharing does not work here". */
function isDismissal(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') return true
  const message = error instanceof Error ? error.message : String(error)
  return /cancel/i.test(message)
}

/**
 * Captures a photo with the device camera, or picks one from the library, and
 * hands it back as a File so it can go through the same compress-and-upload
 * path as a browser file input. Returns null on the web, or if the user backs
 * out of the camera.
 */
export async function capturePhoto(source: 'camera' | 'photos'): Promise<File | null> {
  if (!isNative()) return null
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    const photo = await Camera.getPhoto({
      quality: 85,
      // This app points the WebView at the live site (server.url) rather
      // than bundled local content, so the page's origin is
      // https://gom.favorite.kr - a CameraResultType.Uri result comes back
      // as a capacitor://localhost file URL, which counts as a different
      // origin and silently fails to fetch(). Base64 sidesteps that: the
      // bytes come back inline, no same-origin file access involved.
      resultType: CameraResultType.Base64,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      // Phones record orientation in EXIF rather than rotating the pixels;
      // without this a photo taken sideways uploads sideways.
      correctOrientation: true,
    })
    if (!photo.base64String) return null

    const format = photo.format || 'jpg'
    const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`
    const bytes = Uint8Array.from(atob(photo.base64String), (c) => c.charCodeAt(0))
    return new File([bytes], `photo-${Date.now()}.${format}`, { type: mimeType })
  } catch {
    // Cancelling the camera throws; so does a denied permission, which the
    // OS has already explained to the user.
    return null
  }
}
