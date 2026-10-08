import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { initials } from '@/lib/format'

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'like' | 'nope'
const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300',
  secondary: 'bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50 active:bg-neutral-100',
  ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  like: 'bg-white text-like border-2 border-like hover:bg-green-50',
  nope: 'bg-white text-nope border-2 border-nope hover:bg-rose-50',
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
    sm: 'h-9 px-3 text-sm rounded-lg',
    md: 'h-11 px-4 text-sm font-semibold rounded-xl',
    lg: 'h-12 px-5 text-base font-semibold rounded-xl',
    icon: 'h-14 w-14 rounded-full text-xl',
  }
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 transition-colors select-none disabled:cursor-not-allowed disabled:opacity-70',
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
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center text-brand-600">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }>(
  function Input({ label, hint, className, id, ...rest }, ref) {
    const inputId = id ?? rest.name
    return (
      <label className="block" htmlFor={inputId}>
        {label && <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>}
        <input
          ref={ref}
          id={inputId}
          className={cx(
            'h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-base text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100',
            className,
          )}
          {...rest}
        />
        {hint && <span className="mt-1 block text-xs text-neutral-500">{hint}</span>}
      </label>
    )
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }>(
  function Textarea({ label, className, id, ...rest }, ref) {
    const inputId = id ?? rest.name
    return (
      <label className="block" htmlFor={inputId}>
        {label && <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>}
        <textarea
          ref={ref}
          id={inputId}
          className={cx(
            'w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100',
            className,
          )}
          {...rest}
        />
      </label>
    )
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { label?: string }>(
  function Select({ label, className, id, children, ...rest }, ref) {
    const inputId = id ?? rest.name
    return (
      <label className="block" htmlFor={inputId}>
        {label && <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>}
        <select
          ref={ref}
          id={inputId}
          className={cx(
            'h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-base text-neutral-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100',
            className,
          )}
          {...rest}
        >
          {children}
        </select>
      </label>
    )
  },
)

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-2xl bg-white shadow-sm ring-1 ring-black/5', className)}>{children}</div>
}

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'red' | 'brand'; className?: string }) {
  const tones = {
    neutral: 'bg-neutral-100 text-neutral-700',
    green: 'bg-green-100 text-green-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-rose-100 text-rose-800',
    brand: 'bg-brand-100 text-brand-800',
  }
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>{children}</span>
}

export function AvailabilityBadge({ value }: { value: 'in_stock' | 'low' | 'out_of_stock' }) {
  if (value === 'in_stock') return <Badge tone="green">In stock</Badge>
  if (value === 'low') return <Badge tone="amber">Few left</Badge>
  return <Badge tone="red">Out of stock</Badge>
}

export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.max(11, size / 2.6) }
  if (url) return <img src={url} alt={name} style={style} className="shrink-0 rounded-full object-cover" />
  return (
    <div style={style} className="flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">
      {initials(name) || '?'}
    </div>
  )
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && <div className="mb-3 text-4xl">{icon}</div>}
      <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
      {body && <p className="mt-1 max-w-xs text-sm text-neutral-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null
  return <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{message}</div>
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
          className={cx('leading-none', n <= Math.round(value) ? 'text-amber-400' : 'text-neutral-300', onChange && 'cursor-pointer')}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{title}</h1>
        {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function ProductImage({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
  return src ? (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cx('object-cover', className)}
      onError={(e) => {
        const el = e.currentTarget
        if (!el.dataset.fallback) {
          el.dataset.fallback = '1'
          el.src = `https://picsum.photos/seed/${encodeURIComponent(alt)}/600/800`
        }
      }}
    />
  ) : (
    <div className={cx('flex items-center justify-center bg-neutral-100 text-neutral-400', className)}>No image</div>
  )
}
