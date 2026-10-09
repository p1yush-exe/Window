import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { initials } from '@/lib/format'

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'like' | 'nope'
const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-deep active:bg-accent-deep',
  secondary: 'bg-transparent text-ink border border-line hover:border-ink',
  ghost: 'bg-transparent text-ink hover:bg-surface',
  danger: 'bg-transparent text-ink border border-line hover:bg-surface',
  like: 'bg-accent text-on-accent border border-accent',
  nope: 'bg-transparent text-ink border border-line hover:bg-surface',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, ...rest },
  ref,
) {
  const sizes = {
    sm: 'h-9 px-3 text-[12px]',
    md: 'h-11 px-[18px] text-[13px]',
    lg: 'h-12 px-5 text-[14px]',
    icon: 'h-14 w-14 text-xl',
  }
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded font-mono tracking-[0.04em] uppercase transition-colors select-none disabled:cursor-not-allowed disabled:opacity-50',
        sizes[size],
        variants[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="h-4 w-4" /> : children}
    </button>
  )
})

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx('animate-spin', className ?? 'h-6 w-6')} viewBox="0 0 24 24" fill="none" aria-label="Loading">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center text-accent">
      <Spinner className="h-7 w-7" />
    </div>
  )
}

const field =
  'h-11 w-full rounded border-0 border-b border-line bg-transparent px-0 text-[16px] text-ink outline-none placeholder:text-muted focus:border-accent disabled:opacity-60'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }>(
  function Input({ label, hint, className, id, ...rest }, ref) {
    const inputId = id ?? rest.name
    return (
      <label className="block" htmlFor={inputId}>
        {label && <span className="mb-1 block">{label}</span>}
        <input ref={ref} id={inputId} className={cx(field, className)} {...rest} />
        {hint && <span className="mt-1 block font-mono text-[11px] text-muted">{hint}</span>}
      </label>
    )
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }>(
  function Textarea({ label, className, id, ...rest }, ref) {
    const inputId = id ?? rest.name
    return (
      <label className="block" htmlFor={inputId}>
        {label && <span className="mb-1 block">{label}</span>}
        <textarea ref={ref} id={inputId} className={cx(field, 'h-auto py-2', className)} {...rest} />
      </label>
    )
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { label?: string }>(
  function Select({ label, className, id, children, ...rest }, ref) {
    const inputId = id ?? rest.name
    return (
      <label className="block" htmlFor={inputId}>
        {label && <span className="mb-1 block">{label}</span>}
        <select ref={ref} id={inputId} className={cx(field, 'bg-canvas font-mono text-[13px]', className)} {...rest}>
          {children}
        </select>
      </label>
    )
  },
)

/** Content block: no fill, hairline border, square corners. */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('border border-line bg-transparent', className)}>{children}</div>
}

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'red' | 'brand' | 'accent' | 'outline'; className?: string }) {
  const tones: Record<string, string> = {
    neutral: 'border border-line text-ink',
    outline: 'border border-line text-ink',
    green: 'bg-accent text-on-accent',
    accent: 'bg-accent text-on-accent',
    brand: 'bg-accent text-on-accent',
    amber: 'border border-accent-deep text-ink',
    red: 'border border-line text-muted line-through decoration-muted',
  }
  return (
    <span className={cx('inline-flex items-center rounded px-[7px] py-[3px] font-mono text-[11px] tracking-[0.04em] uppercase', tones[tone], className)}>
      {children}
    </span>
  )
}

export function AvailabilityBadge({ value }: { value: 'in_stock' | 'low' | 'out_of_stock' }) {
  if (value === 'in_stock') return <Badge tone="accent">In stock</Badge>
  if (value === 'low') return <Badge tone="amber">Few left</Badge>
  return <Badge tone="red">Out of stock</Badge>
}

export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.max(11, size / 2.8) }
  if (url) return <img src={url} alt={name} style={style} className="shrink-0 rounded-full object-cover" />
  return (
    <div style={style} className="flex shrink-0 items-center justify-center rounded-full border border-line bg-surface font-mono text-ink">
      {initials(name) || '?'}
    </div>
  )
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start px-4 py-14">
      {icon && <div className="mb-3 text-3xl">{icon}</div>}
      <h3 className="text-[29px] leading-[1.1] text-ink">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-[16px] leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="border-l-2 border-accent bg-surface px-3 py-2 font-mono text-[12px] text-ink">
      <span className="mr-2 text-accent-text">ERR</span>
      {message}
    </div>
  )
}

export function Stars({ value, onChange, size = 'md' }: { value: number; onChange?: (v: number) => void; size?: 'sm' | 'md' | 'lg' }) {
  const cls = { sm: 'text-sm', md: 'text-xl', lg: 'text-3xl' }[size]
  return (
    <div className={cx('inline-flex', cls)} role={onChange ? 'radiogroup' : undefined} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={cx('leading-none', n <= Math.round(value) ? 'text-accent' : 'text-line', onChange && 'cursor-pointer')}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export function PageHeader({ title, subtitle, right, eyebrow }: { title: string; subtitle?: string; right?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="label mb-1">{eyebrow}</p>}
        <h1 className="text-[29px] leading-[1.06] text-ink md:text-[40px]">{title}</h1>
        {subtitle && <p className="mt-1 font-mono text-[12px] text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function placeholderImage(label: string) {
  return `https://placehold.co/640x854/1c1d15/ebfc72/png?text=${encodeURIComponent(label.slice(0, 40))}&font=jetbrains-mono`
}

export function ProductImage({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
  return (
    <img
      src={src || placeholderImage(alt)}
      alt={alt}
      loading="lazy"
      draggable={false}
      className={cx('object-cover select-none', className)}
      onError={(e) => {
        const el = e.currentTarget
        if (!el.dataset.fallback) {
          el.dataset.fallback = '1'
          el.src = placeholderImage(alt)
        }
      }}
    />
  )
}

/** Mono data label, e.g. "2.3 KM · ADALAT BAZAAR". */
export function Meta({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('font-mono text-[12px] tracking-[0.04em] text-muted uppercase', className)}>{children}</span>
}
