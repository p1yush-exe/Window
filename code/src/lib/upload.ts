import { Capacitor } from '@capacitor/core'
import { env } from './env'

export interface UploadProgress {
  loaded: number
  total: number
}

const MAX_EDGE = 1280
const QUALITY = 0.82

/** Downscale and re-encode on the device so uploads are small and EXIF (incl. GPS) is dropped. */
export async function compressImage(file: Blob): Promise<Blob> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height))
    if (scale === 1 && file.size < 600_000) return file
    const w = Math.round(bmp.width * scale)
    const h = Math.round(bmp.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bmp, 0, 0, w, h)
    bmp.close?.()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}

export function uploadImage(file: Blob, onProgress?: (p: UploadProgress) => void, folder = 'window/products'): Promise<string> {
  if (!env.uploadsEnabled) {
    return Promise.reject(new Error('Image uploads are not configured. Paste image URLs instead.'))
  }
  return new Promise((resolve, reject) => {
    const fd = new FormData()
    fd.append('file', file, 'photo.jpg')
    fd.append('upload_preset', env.cloudinary.uploadPreset)
    fd.append('folder', folder)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/image/upload`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.({ loaded: e.loaded, total: e.total })
    }
    xhr.onerror = () => reject(new Error('Upload failed: network error'))
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText) as { secure_url?: string; error?: { message?: string } }
        if (xhr.status >= 200 && xhr.status < 300 && json.secure_url) resolve(json.secure_url)
        else reject(new Error(json.error?.message ?? `Upload failed (${xhr.status})`))
      } catch {
        reject(new Error(`Upload failed (${xhr.status})`))
      }
    }
    xhr.send(fd)
  })
}

/** Compress then upload. */
export async function uploadPhoto(file: Blob, onProgress?: (p: UploadProgress) => void, folder?: string): Promise<string> {
  const small = await compressImage(file)
  return uploadImage(small, onProgress, folder)
}

/** Asks for camera and gallery permission ahead of time (no-op on the web). */
export async function requestCameraPermission(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  const { Camera } = await import('@capacitor/camera')
  const cur = await Camera.checkPermissions()
  if (cur.camera !== 'granted' || cur.photos !== 'granted') await Camera.requestPermissions({ permissions: ['camera', 'photos'] })
}

/**
 * Picks photos: native gallery/camera on Android via Capacitor Camera,
 * otherwise resolves to null so the caller falls back to <input type=file>.
 */
export async function pickNativePhotos(limit: number, source: 'photos' | 'camera'): Promise<Blob[] | null> {
  if (!Capacitor.isNativePlatform()) return null
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
  const perm = await Camera.requestPermissions({ permissions: source === 'camera' ? ['camera'] : ['photos'] })
  if ((source === 'camera' && perm.camera === 'denied') || (source === 'photos' && perm.photos === 'denied')) {
    throw new Error(`${source === 'camera' ? 'Camera' : 'Photo'} permission is off for Window. Allow it in Settings → Apps → Window → Permissions.`)
  }
  if (source === 'camera' || limit === 1) {
    let photo
    try {
      photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      quality: 85,
      width: 1600,
      correctOrientation: true,
    })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (/cancel/i.test(msg)) return []
      throw new Error(`Could not open the ${source === 'camera' ? 'camera' : 'gallery'}: ${msg}`)
    }
    if (!photo.webPath) return []
    return [await (await fetch(photo.webPath)).blob()]
  }
  const res = await Camera.pickImages({ limit, quality: 85, width: 1600, correctOrientation: true })
  return Promise.all(res.photos.map(async (p) => (await fetch(p.webPath)).blob()))
}
