import { cx } from '@/components/ui'

interface Props {
  /** Completed steps (0..total). */
  value: number
  total: number
  label?: string
  className?: string
}

/**
 * Progress rail: 10px tall, 2px ink border, pill radius, green fill that eases in
 * (expo-out, 0.55s), with a count label at its end.
 */
export function ProgressRail({ value, total, label, className }: Props) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0
  return (
    <div className={cx('flex items-center gap-3', className)} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={value} aria-label={label ?? 'Progress'}>
      {label && <span className="label shrink-0">{label}</span>}
      <div className="progress-rail flex-1">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-[14px] font-bold text-charcoal tabular-nums">
        {value}/{total}
      </span>
    </div>
  )
}
