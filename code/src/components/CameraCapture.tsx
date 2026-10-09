import { useEffect, useRef, useState } from 'react'
import { Button, ErrorBanner } from '@/components/ui'
import { Camera, ICON, Image as ImageIcon, RefreshCw, X } from '@/components/icons'
import { isApp } from '@/lib/platform'
import { pickNativePhotos } from '@/lib/upload'

interface Props {
  onCapture: (blob: Blob) => void
  onCancel: () => void
}

/**
 * Live camera preview with capture, or pick from the gallery.
 * On Android the native camera/gallery is used; on the web, getUserMedia.
 */
export function CameraCapture({ onCapture, onCancel }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const native = isApp()

  const [previewFailed, setPreviewFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setReady(false)
    if (!window.isSecureContext) {
      setError('This page is opened over plain http, so the browser blocks the camera. Use the Window app or an https address; you can still choose a photo from the gallery.')
      return
    }
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1600 } }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream.current = s
        if (video.current) {
          video.current.srcObject = s
          void video.current.play().catch(() => undefined)
        }
        setReady(true)
      })
      .catch(() => {
        setPreviewFailed(true)
        if (!native) setError('Camera not available. Choose a photo from your gallery instead.')
      })
    return () => {
      cancelled = true
      stream.current?.getTracks().forEach((t) => t.stop())
      stream.current = null
    }
  }, [facing, native])

  function snap() {
    const v = video.current
    if (!v || !v.videoWidth) return
    // Downscale while grabbing the frame so the crop step gets a small image straight away.
    const scale = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(v.videoWidth * scale)
    c.height = Math.round(v.videoHeight * scale)
    const ctx = c.getContext('2d')
    if (!ctx) return
    if (facing === 'user') {
      ctx.translate(c.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(v, 0, 0, c.width, c.height)
    c.toBlob((b) => b && onCapture(b), 'image/jpeg', 0.85)
  }

  const [useSystem, setUseSystem] = useState(false)

  async function nativePick(source: 'camera' | 'photos') {
    try {
      const blobs = await pickNativePhotos(1, source)
      if (blobs?.[0]) onCapture(blobs[0])
    } catch (e) {
      // The plugin failed (permission or device issue): fall back to the system file chooser,
      // which can also open the camera, and show what went wrong.
      setError(`${e instanceof Error ? e.message : 'Could not open the camera'} — using the system picker instead.`)
      setUseSystem(true)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 pt-[calc(var(--safe-top)+12px)] pb-3">
        <span className="font-mono text-[12px] tracking-[0.053em] text-white uppercase">New product photo</span>
        <button type="button" onClick={onCancel} className="rounded border border-white/60 p-1.5 text-white" aria-label="Close"><X {...ICON} size={16} /></button>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {native && previewFailed ? (
          <div className="px-6 text-center">
            <Camera size={48} strokeWidth={1.5} absoluteStrokeWidth className="mx-auto text-white" />
            <p className="mt-3 text-[15px] text-white/85">Take a photo with the camera or pick one from your gallery.</p>
            {useSystem && (
              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-white/60 px-4 py-3 text-[14px] font-bold text-white uppercase">
                <Camera size={18} strokeWidth={2} absoluteStrokeWidth /> Open system camera
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onCapture(f) }} />
              </label>
            )}
          </div>
        ) : (
          <video ref={video} playsInline muted className="h-full w-full object-cover" style={{ transform: facing === 'user' ? 'scaleX(-1)' : undefined }} />
        )}
        {!ready && !error && !(native && previewFailed) && <p className="absolute font-mono text-[12px] text-white/75 uppercase">Starting camera…</p>}
        <div className="pointer-events-none absolute inset-6 border border-white/60" aria-hidden="true" />
      </div>
      <div className="space-y-3 px-5 pt-4 pb-[calc(var(--safe-bottom)+20px)]">
        <ErrorBanner message={error} />
        <div className="flex items-center justify-between gap-3">
          {/* Gallery goes through the system picker on every platform: it needs no plugin and no extra permission. */}
          <label className="relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border-2 border-white/60 text-white" aria-label="Choose from gallery">
            <ImageIcon {...ICON} />
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onCapture(f) }} />
          </label>
          <button
            type="button"
            onClick={() => (native && previewFailed ? void nativePick('camera') : snap())}
            disabled={!ready && !(native && previewFailed)}
            className="flex h-18 w-18 items-center justify-center rounded-full border-4 border-white bg-eager-green disabled:opacity-40"
            aria-label="Take photo"
          >
            <Camera size={28} strokeWidth={2} absoluteStrokeWidth className="text-white" />
          </button>
          {native && previewFailed ? (
            <span className="h-12 w-12" />
          ) : (
            <Button type="button" variant="ghost" className="h-12 w-12 border-2 border-white/60 px-0 text-white" onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))} aria-label="Flip camera">
              <RefreshCw {...ICON} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
