// Drop-in replacement for @vercel/blob/client's upload() - same call shape
// (filename, file, { onUploadProgress }) => Promise<{ url }> - so the
// callers that used to upload straight to Vercel Blob needed no restructuring,
// just a different import. Uploads straight from the browser to R2 via a
// presigned PUT URL fetched from /api/upload/presigned.
//
// XMLHttpRequest instead of fetch: fetch has no upload-progress event, and
// callers show a progress bar during the PUT.
export async function uploadImage(
  filename: string,
  file: File,
  { onUploadProgress }: { onUploadProgress?: (progress: { loaded: number; total: number }) => void } = {}
): Promise<{ url: string }> {
  const presignRes = await fetch('/api/upload/presigned', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, contentType: file.type, size: file.size }),
  })
  if (!presignRes.ok) {
    const body = await presignRes.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to get an upload URL')
  }
  const { uploadUrl, publicUrl } = await presignRes.json()

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    if (onUploadProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onUploadProgress({ loaded: e.loaded, total: e.total })
      }
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)))
    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.send(file)
  })

  return { url: publicUrl }
}
