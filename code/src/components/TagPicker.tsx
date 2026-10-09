import { cx } from '@/components/ui'
import { MAX_TAGS, TAGS } from '@/lib/types'

export function TagPicker({ value, onChange, max = MAX_TAGS, label = 'Tags', hint }: { value: string[]; onChange: (v: string[]) => void; max?: number; label?: string; hint?: string }) {
  function toggle(t: string) {
    if (value.includes(t)) onChange(value.filter((x) => x !== t))
    else if (value.length < max) onChange([...value, t])
  }
  return (
    <div>
      <span className="label mb-1 block">
        {label} <span className="normal-case">({value.length}/{max})</span>
      </span>
      {hint && <p className="mb-2 text-[13px] text-muted">{hint}</p>}
      <div className="flex flex-wrap gap-1.5">
        {TAGS.map((t) => {
          const on = value.includes(t)
          const full = !on && value.length >= max
          return (
            <button key={t} type="button" onClick={() => toggle(t)} disabled={full} className={cx('rounded px-2.5 py-1.5 font-mono text-[11px] tracking-[0.04em] uppercase ring-1 transition', on ? 'bg-accent text-on-accent ring-accent' : 'text-ink ring-line hover:ring-ink', full && 'opacity-40')}>
              {t}
            </button>
          )
        })}
      </div>
    </div>
  )
}
