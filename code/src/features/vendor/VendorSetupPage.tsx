import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button, ErrorBanner, Input, Textarea, cx } from '@/components/ui'
import { LocationPicker } from '@/components/LocationPicker'
import { OtpField } from '@/components/OtpField'
import { PhotoField } from '@/components/PhotoField'
import { friendlyAuthError, useAuth } from '@/features/auth/AuthProvider'
import { createVendor, emptyVendorInput, type VendorInput } from '@/lib/db'
import { isValidEmail, isValidPhone } from '@/lib/otp'
import { MAX_STORE_TAGS, STORE_TAGS } from '@/lib/types'

const STEPS = ['Shop', 'Location', 'Photo', 'Owner'] as const

export function VendorSetupPage() {
  const { signUp, user, profile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [v, setV] = useState<VendorInput>(emptyVendorInput())
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const patch = (p: Partial<VendorInput>) => setV((cur) => ({ ...cur, ...p }))

  function toggleTag(tag: string) {
    const has = v.tags.includes(tag)
    if (!has && v.tags.length >= MAX_STORE_TAGS) return
    patch({ tags: has ? v.tags.filter((t) => t !== tag) : [...v.tags, tag] })
  }

  function next(e?: FormEvent) {
    e?.preventDefault()
    setError(null)
    if (step === 0) {
      if (v.name.trim().length < 2) return setError('Give your shop a name')
      if (v.tags.length === 0) return setError('Pick at least one tag')
      if (v.website && !/^https?:\/\//i.test(v.website)) patch({ website: `https://${v.website}` })
    }
    if (step === 1 && !v.location) return setError('Pin your store on the map (use GPS or tap the map)')
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  async function finish(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (v.ownerName.trim().length < 2) return setError('Enter the owner name')
    if (!v.phoneVerified) return setError('Verify the phone number')
    if (!v.emailVerified) return setError('Verify the email address')
    if (password.length < 6) return setError('Choose a password of at least 6 characters')
    setBusy(true)
    try {
      const uid = await signUp(v.ownerEmail.trim(), password, 'vendor', v.ownerName.trim())
      await createVendor(uid, { ...v, name: v.name.trim(), website: v.website?.trim() || null })
      navigate('/dashboard/new?welcome=1', { replace: true })
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  if (user && profile) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-neutral-600">You are already logged in as {profile.displayName}.</p>
        <Link to="/" className="mt-3 inline-block text-sm font-semibold text-brand-600 underline">Go to the app</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md px-4 py-6 pt-safe">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Set up your shop</h1>
        <Link to="/vendor" className="text-sm text-neutral-500 underline">Cancel</Link>
      </div>
      <ol className="mb-5 flex gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className={cx('flex-1 rounded-full py-1 text-center text-xs font-semibold', i < step ? 'bg-brand-600 text-white' : i === step ? 'bg-brand-100 text-brand-800' : 'bg-neutral-100 text-neutral-400')}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <form onSubmit={next} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <Input label="Store name" name="name" required minLength={2} maxLength={80} value={v.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Patiala Threads" />
          <div>
            <span className="mb-1 block text-sm font-medium text-neutral-700">What do you sell? <span className="text-neutral-400">(pick up to {MAX_STORE_TAGS})</span></span>
            <div className="flex flex-wrap gap-2">
              {STORE_TAGS.map((t) => {
                const on = v.tags.includes(t)
                const full = !on && v.tags.length >= MAX_STORE_TAGS
                return (
                  <button key={t} type="button" onClick={() => toggleTag(t)} disabled={full} className={cx('rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition', on ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-neutral-700 ring-neutral-200 hover:ring-brand-300', full && 'opacity-40')}>
                    {t}
                  </button>
                )
              })}
            </div>
          </div>
          <Textarea label="Short description (optional)" name="description" rows={2} maxLength={300} value={v.description} onChange={(e) => patch({ description: e.target.value })} placeholder="What makes your shop special" />
          <Input label="Website (optional)" name="website" type="text" inputMode="url" value={v.website ?? ''} onChange={(e) => patch({ website: e.target.value })} placeholder="yourshop.in or Instagram link" />
          <ErrorBanner message={error} />
          <Button type="submit" className="w-full">Next: location</Button>
        </form>
      )}

      {step === 1 && (
        <form onSubmit={next} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-sm text-neutral-600">Where is your store? Shoppers see this on your store page.</p>
          <LocationPicker value={v.location} onChange={(location) => patch({ location })} />
          <ErrorBanner message={error} />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep(0)}>Back</Button>
            <Button type="submit" className="flex-1">Next: photo</Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={next} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-sm text-neutral-600">A photo of your storefront helps shoppers recognise you.</p>
          <PhotoField label="Storefront photo" value={v.storefrontUrl} onChange={(storefrontUrl) => patch({ storefrontUrl })} aspect="aspect-[4/3]" />
          <ErrorBanner message={error} />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button type="submit" className="flex-1">{v.storefrontUrl ? 'Next: owner details' : 'Skip for now'}</Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={finish} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <Input label="Owner name" name="ownerName" required minLength={2} value={v.ownerName} onChange={(e) => patch({ ownerName: e.target.value })} />
          <OtpField label="Owner mobile number" kind="phone" placeholder="98xxxxxxxx" value={v.ownerPhone} onChange={(ownerPhone) => patch({ ownerPhone })} verified={v.phoneVerified} onVerified={(phoneVerified) => patch({ phoneVerified })} validate={isValidPhone} />
          <OtpField label="Owner email" kind="email" placeholder="you@example.com" value={v.ownerEmail} onChange={(ownerEmail) => patch({ ownerEmail })} verified={v.emailVerified} onVerified={(emailVerified) => patch({ emailVerified })} validate={isValidEmail} />
          <Input label="Create a password" name="password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} hint="You log in with this email and password on other devices" />
          <ErrorBanner message={error} />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep(2)}>Back</Button>
            <Button type="submit" className="flex-1" loading={busy}>Open my shop</Button>
          </div>
        </form>
      )}
    </div>
  )
}
