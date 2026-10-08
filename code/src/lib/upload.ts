import { env } from './env'

export async function uploadImage(file: File): Promise<string> {
  if (!env.uploadsEnabled) {
    throw new Error('Image uploads are not configured. Paste image URLs instead.')
  }
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', env.cloudinary.uploadPreset)
  fd.append('folder', 'window/products')
  const res = await fetch(`https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/image/upload`, {
    method: 'POST',
    body: fd,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Upload failed (${res.status}) ${text}`)
  }
  const json = (await res.json()) as { secure_url?: string }
  if (!json.secure_url) throw new Error('Upload did not return a URL')
  return json.secure_url
}
