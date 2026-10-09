import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button, ErrorBanner, Input, Textarea, cx } from '@/components/ui'
import { LocationPicker } from '@/components/LocationPicker'
import { OtpField } from '@/components/OtpField'
import { PhotoField } from '@/components/PhotoField'
import { GoogleButton } from '@/components/GoogleButton'
import { TagPicker } from '@/components/TagPicker'
import { friendlyAuthError, useAuth } from '@/features/auth/AuthProvider'
import { createShop, createVendor, emptyShopInput, updateProfile, updateVendor, type ShopInput } from '@/lib/db'
import { setMode } from '@/lib/mode'
import { isValidEmail, isValidPhone } from '@/lib/otp'

const STEPS = ['Shop', 'Location', 'Photo', 'Owner'] as const

/** Creates the owner profile and the first shop. Works for new accounts and for logged-in shoppers. */
export function VendorSetupPage() {
  const { signUp, user, profile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [shop, setShop] = useState<ShopInput>(emptyShopInput())
  const [ownerName, setOwnerName] = useState(profile?.displayName ?? '')
  const [ownerPhone, setOwnerPhone] = useState(profile?.phone ?? '')
  const [ownerEmail, setOwnerEmail] = useState(profile?.email ?? user?.email ?? '')
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [emailVerified, setEmailVerified] = useState(Boolean(user?.email))
  const [password, setPassword] = useState('')
  const [googleUid, setGoogleUid] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const patch = (p: Partial<ShopInput>) => setShop((cur) => ({ ...cur, ...p }))
  const existingUid = profile && !profile.hasShop ? profile.uid : null

  function next(e?: FormEvent) {
    e?.preventDefault()
    setError(null)
    if (step === 0) {
      if (shop.name.trim().length < 2) return setError('Give your shop a name')
      if (shop.tags.length === 0) return setError('Pick at least one tag')
    }
    if (step === 1 && !shop.location) return setError('Pin your store on the map (use GPS or tap the map)')
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  async function finish(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (ownerName.trim().length < 2) return setError('Enter the owner name')
    if (!phoneVerified) return setError('Verify the phone number')
    if (!emailVerified) return setError('Verify the email address')
    if (!googleUid && !existingUid && password.length < 6) return setError('Choose a password of at least 6 characters')
    setBusy(true)
    try {
      const uid = googleUid ?? existingUid ?? (await signUp(ownerEmail.trim(), password, 'vendor', ownerName.trim()))
      await createVendor(uid, { ownerName: ownerName.trim(), ownerPhone: ownerPhone.trim(), ownerEmail: ownerEmail.trim(), phoneVerified, emailVerified })
      const site = shop.website?.trim()
      const shopId = await createShop(uid, { ...shop, name: shop.name.trim(), website: site ? (/^https?:\/\//i.test(site) ? site : `https://${site}`) : null })
      await updateVendor(uid, { primaryShopId: shopId })
      await updateProfile(uid, { hasShop: true, phone: ownerPhone.trim() }).catch(() => undefined)
      setMode('vendor')
      navigate('/vendor/new?welcome=1', { replace: true })
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  if (profile?.hasShop) {
    return (
      <div className="p-6 text-center">
        <p className="text-[14px] text-muted">You already have a shop.</p>
        <Link to="/vendor/home" className="mt-3 inline-block font-mono text-[12px] text-accent-text uppercase underline">Go to the seller app</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md px-4 py-6 pt-safe">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-[29px] tracking-[-0.03em]">Set up your shop</h1>
        <Link to={profile ? '/feed' : '/vendor'} className="font-mono text-[12px] text-muted uppercase underline">Cancel</Link>
      </div>
      <ol className="mb-5 flex gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className={cx('flex-1 rounded py-1 text-center font-mono text-[11px] tracking-[0.04em] uppercase', i < step ? 'bg-accent text-on-accent' : i === step ? 'bg-surface text-accent-text' : 'bg-surface text-muted')}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <form onSubmit={next} className="space-y-4 border border-line p-4">
          <Input label="Shop name" name="name" required minLength={2} maxLength={80} value={shop.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Patiala Threads" />
          <TagPicker value={shop.tags} onChange={(tags) => patch({ tags })} label="What do you sell?" hint="Pick up to 3 tags. No food, medical or electronics listings on Window." />
          <Textarea label="Short description (optional)" name="description" rows={2} maxLength={300} value={shop.description} onChange={(e) => patch({ description: e.target.value })} placeholder="What makes your shop special" />
          <Input label="Website (optional)" name="website" type="text" inputMode="url" value={shop.website ?? ''} onChange={(e) => patch({ website: e.target.value })} placeholder="yourshop.in or Instagram link" />
          <ErrorBanner message={error} />
          <Button type="submit" className="w-full">Next: location</Button>
        </form>
      )}

      {step === 1 && (
        <form onSubmit={next} className="space-y-4 border border-line p-4">
          <p className="text-[14px] text-muted">Where is your store? Shoppers nearby see it.</p>
          <LocationPicker value={shop.location} onChange={(location) => patch({ location })} searchable />
          <ErrorBanner message={error} />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep(0)}>Back</Button>
            <Button type="submit" className="flex-1">Next: photo</Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={next} className="space-y-4 border border-line p-4">
          <p className="text-[14px] text-muted">A photo of your storefront helps shoppers recognise you.</p>
          <PhotoField label="Storefront photo" value={shop.storefrontUrl} onChange={(storefrontUrl) => patch({ storefrontUrl })} aspect="aspect-[4/3]" folder="window/storefronts" />
          <ErrorBanner message={error} />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button type="submit" className="flex-1">{shop.storefrontUrl ? 'Next: owner details' : 'Skip for now'}</Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={finish} className="space-y-4 border border-line p-4">
          {!googleUid && !existingUid && (
            <>
              <GoogleButton
                role="vendor"
                label="Fill with Google"
                onDone={(r) => {
                  if (!r.isNew && r.existingRole === 'vendor') return navigate('/vendor/home', { replace: true })
                  setGoogleUid(r.uid)
                  setOwnerName(r.displayName ?? ownerName)
                  setOwnerEmail(r.email ?? ownerEmail)
                  setEmailVerified(Boolean(r.email))
                }}
              />
              <div className="flex items-center gap-3 font-mono text-[11px] text-muted uppercase"><span className="h-px flex-1 bg-line" />or fill by hand<span className="h-px flex-1 bg-line" /></div>
            </>
          )}
          {(googleUid || existingUid) && <p className="font-mono text-[12px] text-accent-text">Using your signed-in account · email verified</p>}
          <Input label="Owner name" name="ownerName" required minLength={2} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          <OtpField label="Owner mobile number" kind="phone" placeholder="98xxxxxxxx" value={ownerPhone} onChange={setOwnerPhone} verified={phoneVerified} onVerified={setPhoneVerified} validate={isValidPhone} />
          {googleUid || existingUid ? (
            <Input label="Owner email" name="ownerEmail" type="email" value={ownerEmail} disabled />
          ) : (
            <>
              <OtpField label="Owner email" kind="email" placeholder="you@example.com" value={ownerEmail} onChange={setOwnerEmail} verified={emailVerified} onVerified={setEmailVerified} validate={isValidEmail} />
              <Input label="Create a password" name="password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} hint="You log in with this email and password on other devices" />
            </>
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
