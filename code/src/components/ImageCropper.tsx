import { useCallback, useEffect, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Button } from '@/components/ui'
import { Check, ICON, X } from '@/components/icons'

interface Props {
  blob: Blob
  aspect?: number
  onDone: (cropped: Blob) => void
  onCancel: () => void
}

async function cropToBlob(src: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = reject
    i.src = src
  })
  const canvas = document.createElement('canvas')
  const scale = Math.min(1, 1600 / Math.max(area.width, area.height))
  canvas.width = Math.round(area.width * scale)
  canvas.height = Math.round(area.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Crop failed'))), 'image/jpeg', 0.9))
}

/** Pinch/zoom/drag crop with a fixed 3:4 product frame. */
export function ImageCropper({ blob, aspect = 3 / 4, onDone, onCancel }: Props) {
  const [src, setSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const url = URL.createObjectURL(blob)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [blob])

  const onComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), [])

  async function finish() {
    if (!src || !area) return
    setBusy(true)
    try {
      onDone(await cropToBlob(src, area))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 pt-[calc(var(--safe-top)+12px)] pb-3">
        <span className="font-mono text-[12px] tracking-[0.06em] text-bone-vellum uppercase">Crop · drag and pinch</span>
        <button type="button" onClick={onCancel} className="rounded border border-bone-vellum/40 p-1.5 text-bone-vellum" aria-label="Cancel"><X {...ICON} size={16} /></button>
      </div>
      <div className="relative flex-1">
        {src && <Cropper image={src} crop={crop} zoom={zoom} aspect={aspect} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onComplete} showGrid={false} />}
      </div>
      <div className="space-y-3 px-5 pt-4 pb-[calc(var(--safe-bottom)+20px)]">
        <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-[#ebfc72]" aria-label="Zoom" />
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1 border-bone-vellum/40 text-bone-vellum" onClick={onCancel}>Retake</Button>
          <Button type="button" className="flex-1" loading={busy} onClick={() => void finish()}><Check {...ICON} size={16} /> Use photo</Button>
        </div>
      </div>
    </div>
  )
}
