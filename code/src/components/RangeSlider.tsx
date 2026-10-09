import { cx } from '@/components/ui'

interface Props {
  min: number
  max: number
  low: number
  high: number
  step?: number
  onChange: (low: number, high: number) => void
}

/** Two overlapped range inputs that act as one dual-thumb slider. */
export function RangeSlider({ min, max, low, high, step = 1, onChange }: Props) {
  const span = Math.max(1, max - min)
  const lo = ((low - min) / span) * 100
  const hi = ((high - min) / span) * 100
  return (
    <div className="relative h-8">
      <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-faded-gray" />
      <div className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-eager-green" style={{ left: `${lo}%`, right: `${100 - hi}%` }} />
      {[
        { v: low, set: (v: number) => onChange(Math.min(v, high), high) },
        { v: high, set: (v: number) => onChange(low, Math.max(v, low)) },
      ].map((t, i) => (
        <input
          key={i}
          type="range"
          min={min}
          max={max}
          step={step}
          value={t.v}
          onChange={(e) => t.set(Number(e.target.value))}
          className={cx('range-thumb pointer-events-none absolute inset-x-0 top-0 h-8 w-full appearance-none bg-transparent', i === 1 && 'z-10')}
          aria-label={i === 0 ? 'Lower price' : 'Upper price'}
        />
      ))}
    </div>
  )
}
