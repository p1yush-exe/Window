import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button, ErrorBanner, Input, Textarea, cx } from '@/components/ui'
import { LocationPicker } from '@/components/LocationPicker'
import { OtpField } from '@/components/OtpField'
import { PhotoField } from '@/components/PhotoField'
import { GoogleButton } from '@/components/GoogleButton'
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
  const [googleUid, setGoogleUid] = useState<string | null>(null)
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
    if (!googleUid && password.length < 6) return setError('Choose a password of at least 6 characters')
    setBusy(true)
    try {
      const uid = googleUid ?? (await signUp(v.ownerEmail.trim(), password, 'vendor', v.ownerName.trim()))
      await createVendor(uid, { ...v, name: v.name.trim(), website: v.website?.trim() || null })
      navigate('/dashboard/new?welcome=1', { replace: true })
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  if (user && profile && !googleUid) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-ink">You are already logged in as {profile.displayName}.</p>
        <Link to="/" className="mt-3 inline-block text-sm font-semibold text-accent-text underline">Go to the app</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md px-4 py-6 pt-safe">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-normal tracking-[-0.03em]">Set up your shop</h1>
        <Link to="/vendor" className="text-sm text-muted underline">Cancel</Link>
      </div>
      <ol className="mb-5 flex gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className={cx('flex-1 rounded py-1 text-center font-mono text-[11px] uppercase tracking-[0.04em]', i < step ? 'bg-accent text-on-accent' : i === step ? 'bg-surface text-accent-text' : 'bg-surface text-muted')}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <form onSubmit={next} className="space-y-4 rounded-2xl bg-canvas p-4 ring-1 ring-line">
          <Input label="Store name" name="name" required minLength={2} maxLength={80} value={v.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Patiala Threads" />
          <div>
            <span className="mb-1 block text-sm font-medium text-ink">What do you sell? <span className="text-muted">(pick up to {MAX_STORE_TAGS})</span></span>
            <div className="flex flex-wrap gap-2">
              {STORE_TAGS.map((t) => {
                const on = v.tags.includes(t)
                const full = !on && v.tags.length >= MAX_STORE_TAGS
                return (
                  <button key={t} type="button" onClick={() => toggleTag(t)} disabled={full} className={cx('rounded px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.04em] ring-1 transition', on ? 'bg-accent text-on-accent ring-accent' : 'bg-canvas text-ink ring-line hover:ring-accent', full && 'opacity-40')}>
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
        <form onSubmit={next} className="space-y-4 rounded-2xl bg-canvas p-4 ring-1 ring-line">
          <p className="text-sm text-ink">Where is your store? Shoppers see this on your store page.</p>
          <LocationPicker value={v.location} onChange={(location) => patch({ location })} />
          <ErrorBanner message={error} />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep(0)}>Back</Button>
            <Button type="submit" className="flex-1">Next: photo</Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={next} className="space-y-4 rounded-2xl bg-canvas p-4 ring-1 ring-line">
          <p className="text-sm text-ink">A photo of your storefront helps shoppers recognise you.</p>
          <PhotoField label="Storefront photo" value={v.storefrontUrl} onChange={(storefrontUrl) => patch({ storefrontUrl })} aspect="aspect-[4/3]" />
          <ErrorBanner message={error} />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button type="submit" className="flex-1">{v.storefrontUrl ? 'Next: owner details' : 'Skip for now'}</Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={finish} className="space-y-4 rounded-2xl bg-canvas p-4 ring-1 ring-line">
          {!googleUid && (
            <>
              <GoogleButton
                role="vendor"
                label="Fill with Google"
                onDone={(r) => {
                  if (!r.isNew && r.existingRole === 'buyer') return setError('That Google account is a shopper account. Use another Google account or email.')
                  if (!r.isNew && r.existingRole === 'vendor') return navigate('/dashboard', { replace: true })
                  setGoogleUid(r.uid)
                  patch({ ownerName: r.displayName ?? v.ownerName, ownerEmail: r.email ?? v.ownerEmail, emailVerified: Boolean(r.email) })
                }}
              />
              <div className="flex items-center gap-3 font-mono text-[11px] text-muted uppercase"><span className="h-px flex-1 bg-line" />or fill by hand<span className="h-px flex-1 bg-line" /></div>
            </>
          )}
          {googleUid && <p className="font-mono text-[12px] text-accent-text">Signed in with Google · email verified</p>}
          <Input label="Owner name" name="ownerName" required minLength={2} value={v.ownerName} onChange={(e) => patch({ ownerName: e.target.value })} />
          <OtpField label="Owner mobile number" kind="phone" placeholder="98xxxxxxxx" value={v.ownerPhone} onChange={(ownerPhone) => patch({ ownerPhone })} verified={v.phoneVerified} onVerified={(phoneVerified) => patch({ phoneVerified })} validate={isValidPhone} />
          <OtpField label="Owner email" kind="email" placeholder="you@example.com" value={v.ownerEmail} onChange={(ownerEmail) => patch({ ownerEmail })} verified={v.emailVerified} onVerified={(emailVerified) => patch({ emailVerified })} validate={isValidEmail} />
          {!googleUid && (
            <Input label="Create a password" name="password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} hint="You log in with this email and password on other devices" />
          )}
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
