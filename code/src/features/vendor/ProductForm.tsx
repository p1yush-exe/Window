import { useEffect, useState, type FormEvent } from 'react'
import { Button, ErrorBanner, Input, Select, Textarea, cx } from '@/components/ui'
import { RangeSlider } from '@/components/RangeSlider'
import { TagPicker } from '@/components/TagPicker'
import { HeartPlus, ICON_SM } from '@/components/icons'
import type { ProductInput } from '@/lib/db'
import { PAYMENT_MODES, countWords, type PaymentMode, type Shop } from '@/lib/types'

export const MAX_WORDS = 150

interface Props {
  shops: Shop[]
  initial?: Partial<ProductInput> & { shopId?: string }
  submitLabel: string
  busy?: boolean
  onSubmit: (input: ProductInput, shopId: string) => void | Promise<void>
}

/** Tags → name → description → cost range → shop → payment modes → super-only. */
export function ProductForm({ shops, initial, submitLabel, busy, onSubmit }: Props) {
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [lowText, setLowText] = useState(initial?.priceMin != null ? String(initial.priceMin) : '')
  const [highText, setHighText] = useState(initial?.priceMax != null ? String(initial.priceMax) : '')
  const [shopId, setShopId] = useState(initial?.shopId ?? shops[0]?.id ?? '')
  const [modes, setModes] = useState<PaymentMode[]>(initial?.paymentModes ?? [...PAYMENT_MODES])
  const [superOnly, setSuperOnly] = useState(initial?.superOnly ?? false)
  const [error, setError] = useState<string | null>(null)

  const low = Number(lowText)
  const high = Number(highText)
  const rangeReady = lowText !== '' && highText !== '' && Number.isFinite(low) && Number.isFinite(high) && low >= 0 && high >= low
  const words = countWords(description)

  useEffect(() => {
    if (!shopId && shops[0]) setShopId(shops[0].id)
  }, [shops, shopId])

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (tags.length === 0) return setError('Pick at least one tag')
    if (title.trim().length < 2) return setError('Give the product a name')
    if (words > MAX_WORDS) return setError(`Description must be ${MAX_WORDS} words or fewer`)
    if ((lowText !== '' || highText !== '') && !rangeReady) return setError('Enter a valid price range (low to high)')
    if (!shopId) return setError('Choose which shop this belongs to')
    if (modes.length === 0) return setError('Choose at least one payment mode')
    void onSubmit(
      {
        title: title.trim(),
        description: description.trim(),
        tags,
        priceMin: rangeReady ? low : null,
        priceMax: rangeReady ? high : null,
        currency: 'INR',
        imageUrls: initial?.imageUrls ?? [],
        availability: initial?.availability ?? 'in_stock',
        paymentModes: modes,
        superOnly,
      },
      shopId,
    )
  }

  const sliderMin = 0
  const sliderMax = rangeReady ? Math.max(high * 1.5, low + 100, 500) : 1000

  return (
    <form onSubmit={submit} className="space-y-5">
      <TagPicker value={tags} onChange={setTags} label="Product tags" hint="Up to 3 tags that describe it best." />
      <Input label="Product name" name="title" required minLength={2} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Hand-block printed kurta" hint="A product ID is generated when you publish." />
      <div>
        <Textarea label="Short description" name="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Material, sizes, what makes it special" />
        <p className={cx('mt-1 text-right font-mono text-[11px]', words > MAX_WORDS ? 'text-charcoal underline' : 'text-pencil-gray')}>{words}/{MAX_WORDS} words</p>
      </div>

      <div>
        <span className="label mb-1 block">Cost range (INR)</span>
        <div className="flex items-center gap-3">
          <input inputMode="decimal" placeholder="low" value={lowText} onChange={(e) => setLowText(e.target.value.replace(/[^\d.]/g, ''))} className="h-12 w-full rounded-xl border-2 border-faded-gray bg-white text-center text-[16px] font-bold text-charcoal outline-none placeholder:text-faded-gray focus:border-spark-blue" aria-label="Lowest price" />
          <span className="font-mono text-pencil-gray">–</span>
          <input inputMode="decimal" placeholder="high" value={highText} onChange={(e) => setHighText(e.target.value.replace(/[^\d.]/g, ''))} className="h-12 w-full rounded-xl border-2 border-faded-gray bg-white text-center text-[16px] font-bold text-charcoal outline-none placeholder:text-faded-gray focus:border-spark-blue" aria-label="Highest price" />
        </div>
        {rangeReady && (
          <div className="mt-3">
            <RangeSlider min={sliderMin} max={Math.round(sliderMax)} low={low} high={high} step={Math.max(1, Math.round(sliderMax / 200))} onChange={(l, h) => { setLowText(String(l)); setHighText(String(h)) }} />
            <p className="mt-1 font-mono text-[11px] text-pencil-gray uppercase">₹{low.toLocaleString('en-IN')} – ₹{high.toLocaleString('en-IN')} · drag to fine-tune</p>
          </div>
        )}
        {!rangeReady && <p className="mt-1 font-mono text-[11px] text-pencil-gray uppercase">Leave empty to let buyers ask</p>}
      </div>

      <Select label={shops.length > 1 ? 'Which shop is this from?' : 'Shop'} name="shopId" value={shopId} onChange={(e) => setShopId(e.target.value)}>
        {shops.length === 0 && <option value="">No shop yet · create one in Shop management</option>}
        {shops.map((s) => <option key={s.id} value={s.id}>{s.name}{s.location?.area ? ` · ${s.location.area}` : ''}</option>)}
      </Select>

      <div>
        <span className="label mb-1 block">Payment modes</span>
        <div className="flex gap-2">
          {PAYMENT_MODES.map((m) => {
            const on = modes.includes(m)
            return (
              <button key={m} type="button" onClick={() => setModes((cur) => (on ? cur.filter((x) => x !== m) : [...cur, m]))} className={cx('flex-1 rounded py-2 font-mono text-[12px] uppercase ring-1', on ? 'bg-eager-green text-white ring-ink' : 'text-charcoal ring-line')}>
                {m}
              </button>
            )
          })}
        </div>
        <p className="mt-1 font-mono text-[11px] text-pencil-gray uppercase">Preset for the prototype · setup comes later</p>
      </div>

      <label className="flex cursor-pointer items-center gap-3 border-2 border-faded-gray p-3">
        <input type="checkbox" checked={superOnly} onChange={(e) => setSuperOnly(e.target.checked)} className="h-5 w-5 accent-[#58cc02]" />
        <span className="flex-1 text-[14px] text-charcoal">Allow only super swipes</span>
        <HeartPlus {...ICON_SM} className="text-super" />
      </label>

      <ErrorBanner message={error} />
      <Button type="submit" className="w-full" size="lg" loading={busy}>{submitLabel}</Button>
    </form>
  )
}
