import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Star } from 'lucide-react'
import { initials } from '@/lib/format'

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'like' | 'nope'
const variants: Record<Variant, string> = {
  primary: 'bg-eager-green text-white border-2 border-eager-green hover:bg-eager-green-deep hover:border-eager-green',
  secondary: 'bg-white text-spark-blue border-2 border-faded-gray hover:border-spark-blue',
  ghost: 'bg-transparent text-charcoal hover:bg-[#f7f7f7] border-2 border-transparent',
  danger: 'bg-white text-nope border-2 border-faded-gray hover:border-nope',
  like: 'bg-eager-green text-white border-2 border-eager-green',
  nope: 'bg-white text-nope border-2 border-faded-gray hover:border-nope',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }, ref) {
  const sizes = { sm: 'h-10 px-3.5 text-[13px]', md: 'h-12 px-4 text-[15px]', lg: 'h-14 px-5 text-[16px]', icon: 'h-14 w-14 text-xl' }
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx('inline-flex items-center justify-center gap-2 rounded-xl font-bold tracking-[0.053em] uppercase transition-colors select-none active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50', sizes[size], variants[variant], className)}
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
    <div className="flex h-full min-h-[60vh] items-center justify-center text-eager-green">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

const field = 'h-12 w-full rounded-xl border-2 border-faded-gray bg-white px-4 text-[16px] font-medium text-charcoal outline-none placeholder:text-faded-gray focus:border-spark-blue disabled:bg-[#f7f7f7] disabled:opacity-70'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }>(function Input({ label, hint, className, id, ...rest }, ref) {
  const inputId = id ?? rest.name
  return (
    <label className="block" htmlFor={inputId}>
      {label && <span className="mb-1.5 block">{label}</span>}
      <input ref={ref} id={inputId} className={cx(field, className)} {...rest} />
      {hint && <span className="mt-1 block text-[13px] font-medium text-pencil-gray">{hint}</span>}
    </label>
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }>(function Textarea({ label, className, id, ...rest }, ref) {
  const inputId = id ?? rest.name
  return (
    <label className="block" htmlFor={inputId}>
      {label && <span className="mb-1.5 block">{label}</span>}
      <textarea ref={ref} id={inputId} className={cx(field, 'h-auto py-3', className)} {...rest} />
    </label>
  )
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { label?: string }>(function Select({ label, className, id, children, ...rest }, ref) {
  const inputId = id ?? rest.name
  return (
    <label className="block" htmlFor={inputId}>
      {label && <span className="mb-1.5 block">{label}</span>}
      <select ref={ref} id={inputId} className={cx(field, 'font-bold', className)} {...rest}>
        {children}
      </select>
    </label>
  )
})

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-xl border-2 border-faded-gray bg-white', className)}>{children}</div>
}

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'red' | 'brand' | 'accent' | 'outline'; className?: string }) {
  const tones: Record<string, string> = {
    neutral: 'border-2 border-faded-gray text-pencil-gray',
    outline: 'border-2 border-faded-gray text-pencil-gray',
    green: 'bg-eager-green text-white',
    accent: 'bg-eager-green text-white',
    brand: 'bg-eager-green text-white',
    amber: 'border-2 border-eager-green text-eager-green',
    red: 'border-2 border-faded-gray text-faded-gray line-through',
  }
  return <span className={cx('inline-flex items-center rounded-lg px-2 py-0.5 text-[12px] font-bold tracking-[0.053em] uppercase', tones[tone], className)}>{children}</span>
}

export function AvailabilityBadge({ value }: { value: 'in_stock' | 'low' | 'out_of_stock' }) {
  if (value === 'in_stock') return <Badge tone="accent">In stock</Badge>
  if (value === 'low') return <Badge tone="amber">Few left</Badge>
  return <Badge tone="red">Out of stock</Badge>
}

export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.max(11, size / 2.6) }
  if (url) return <img src={url} alt={name} style={style} className="shrink-0 rounded-full border-2 border-faded-gray object-cover" />
  return (
    <div style={style} className="flex shrink-0 items-center justify-center rounded-full border-2 border-faded-gray bg-storybook-green font-bold text-charcoal">
      {initials(name) || '?'}
    </div>
  )
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-14 text-center">
      {icon && <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-storybook-green text-eager-green">{icon}</div>}
      <h3 className="text-[26px] leading-tight text-charcoal">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-[16px] leading-snug text-pencil-gray">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null
  return <div className="rounded-xl border-2 border-nope bg-[#fff2f2] px-3 py-2 text-[14px] font-bold text-nope">{message}</div>
}

export function Stars({ value, onChange, size = 'md' }: { value: number; onChange?: (v: number) => void; size?: 'sm' | 'md' | 'lg' }) {
  const px = { sm: 14, md: 20, lg: 30 }[size]
  return (
    <div className="inline-flex gap-0.5" role={onChange ? 'radiogroup' : undefined} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} className={cx('leading-none', n <= Math.round(value) ? 'text-[#ffc800]' : 'text-faded-gray', onChange && 'cursor-pointer')} aria-label={`${n} star${n > 1 ? 's' : ''}`}>
          <Star size={px} strokeWidth={2} absoluteStrokeWidth fill={n <= Math.round(value) ? 'currentColor' : 'none'} />
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
        <h1 className="text-[32px] leading-[1.1] text-eager-green md:text-[40px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] font-bold text-pencil-gray">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function placeholderImage(label: string) {
  return `https://placehold.co/640x854/d7ffb8/4b4b4b/png?text=${encodeURIComponent(label.slice(0, 40))}&font=nunito`
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

export function Meta({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('text-[13px] font-bold tracking-[0.053em] text-pencil-gray uppercase', className)}>{children}</span>
}
