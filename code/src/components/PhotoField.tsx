import { useState } from 'react'
import { Button, ErrorBanner, Input, cx } from '@/components/ui'
import { env } from '@/lib/env'
import { uploadImage } from '@/lib/upload'

interface Props {
  label: string
  value: string | null
  onChange: (url: string | null) => void
  aspect?: string
}

/** Single photo: file upload when Cloudinary is configured, URL input otherwise. */
export function PhotoField({ label, value, onChange, aspect = 'aspect-square' }: Props) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFile(files: FileList | null) {
    const f = files?.[0]
    if (!f) return
    setBusy(true)
    setError(null)
    try {
      onChange(await uploadImage(f))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
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

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-neutral-700">{label}</span>
      {value ? (
        <div className="relative">
          <img src={value} alt="" className={cx('w-full rounded-2xl object-cover ring-1 ring-black/10', aspect)} />
          <button type="button" onClick={() => onChange(null)} className="absolute top-2 right-2 rounded-full bg-neutral-900/80 px-3 py-1 text-xs font-semibold text-white">Remove</button>
        </div>
      ) : env.uploadsEnabled ? (
        <label className={cx('flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 text-sm text-neutral-500 hover:border-brand-400', aspect)}>
          <span className="text-3xl">📷</span>
          {busy ? 'Uploading…' : 'Tap to take or choose a photo'}
          <input type="file" accept="image/*" capture="environment" className="hidden" disabled={busy} onChange={(e) => void onFile(e.target.files)} />
        </label>
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
