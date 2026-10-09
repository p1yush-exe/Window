import { useState } from 'react'
import { Button, ErrorBanner, Input, cx } from '@/components/ui'
import { Camera, ICON_SM, Image } from '@/components/icons'
import { env } from '@/lib/env'
import { isNative } from '@/lib/native'
import { pickNativePhotos, uploadPhoto } from '@/lib/upload'

interface Props {
  label: string
  value: string | null
  onChange: (url: string | null) => void
  aspect?: string
  folder?: string
}

/** Single photo: camera/gallery upload when Cloudinary is configured, URL input otherwise. */
export function PhotoField({ label, value, onChange, aspect = 'aspect-square', folder }: Props) {
  const [url, setUrl] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handle(blob: Blob) {
    setError(null)
    setPreview(URL.createObjectURL(blob))
    setProgress(0)
    try {
      const uploaded = await uploadPhoto(blob, (p) => setProgress(Math.round((p.loaded / p.total) * 100)), folder)
      onChange(uploaded)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setProgress(null)
      setPreview(null)
    }
  }

  async function native(source: 'photos' | 'camera') {
    try {
      const blobs = await pickNativePhotos(1, source)
      if (blobs?.[0]) await handle(blobs[0])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the camera')
    }
  }

  function addUrl() {
    try {
      new URL(url.trim())
      onChange(url.trim())
      setUrl('')
      setError(null)
    } catch {
      setError('That is not a valid URL')
    }
  }

  const shown = preview ?? value

  return (
    <div className="space-y-2">
      <span className="label block">{label}</span>
      {shown ? (
        <div className="relative">
          <img src={shown} alt="" className={cx('w-full rounded object-cover ring-1 ring-line', aspect, progress !== null && 'opacity-60')} />
          {progress !== null && (
            <div className="absolute inset-x-3 bottom-3 h-1 bg-bone-vellum/30">
              <div className="h-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
            </div>
          )}
          {progress === null && (
            <button type="button" onClick={() => onChange(null)} className="absolute top-2 right-2 rounded bg-ink/80 px-3 py-1 font-mono text-[11px] text-canvas uppercase">Remove</button>
          )}
        </div>
      ) : env.uploadsEnabled ? (
        isNative() ? (
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => void native('camera')}><Camera {...ICON_SM} /> Camera</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={() => void native('photos')}><Image {...ICON_SM} /> Gallery</Button>
          </div>
        ) : (
          <label className={cx('flex cursor-pointer flex-col items-center justify-center gap-1 rounded border border-dashed border-line font-mono text-[12px] text-muted uppercase hover:border-ink', aspect)}>
            <Camera size={24} strokeWidth={1.75} absoluteStrokeWidth />
            Tap to take or choose a photo
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handle(f) }} />
          </label>
        )
      ) : (
        <div className="flex gap-2">
          <Input name="photoUrl" placeholder="https://… photo URL" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl() } }} />
          <Button type="button" variant="secondary" onClick={addUrl}>Add</Button>
        </div>
      )}
      <ErrorBanner message={error} />
    </div>
  )
}
