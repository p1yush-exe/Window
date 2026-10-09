import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button, ErrorBanner, cx } from '@/components/ui'
import { LocationPicker } from '@/components/LocationPicker'
import { ProgressRail } from '@/components/ProgressRail'
import { useAuth } from '@/features/auth/AuthProvider'
import { updateProfile } from '@/lib/db'
import { getShopperPrefs, setShopperPrefs } from '@/lib/prefs'
import { requestLocationPermission } from '@/lib/geo'
import { isApp } from '@/lib/platform'
import { MAX_STORE_TAGS, STORE_TAGS, type StoreLocation } from '@/lib/types'

/** Where are you, and what are you into? Guests keep it on the device; accounts also save it. */
export function ShopperSetupPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const initial = getShopperPrefs()
  const [step, setStep] = useState<0 | 1>(initial.location ? 1 : 0)
  const [location, setLocation] = useState<StoreLocation | null>(profile?.location ?? initial.location)
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? initial.interests)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (isApp()) void requestLocationPermission().catch(() => undefined)
  }, [])

  function toggle(tag: string) {
    setInterests((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : cur.length < MAX_STORE_TAGS ? [...cur, tag] : cur))
  }

  async function finish() {
    if (!location) return setError('Pick your area first')
    if (interests.length === 0) return setError('Pick at least one interest')
    setBusy(true)
    setShopperPrefs({ location, interests })
    try {
      if (profile) await updateProfile(profile.uid, { location, interests })
      navigate('/feed', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md px-4 py-6 pt-safe">
      <div className="mb-5 flex items-center gap-4">
        <ProgressRail value={step} total={2} label="Shopping" className="flex-1" />
        <Link to={initial.location ? '/feed' : '/'} className="font-mono text-[12px] text-pencil-gray underline">Cancel</Link>
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <h1 className="text-[40px] leading-[1.05]">Where are you shopping?</h1>
          <p className="text-[16px] leading-relaxed text-pencil-gray">Window only shows sellers around you. Use GPS or search for your area.</p>
          <LocationPicker value={location} onChange={setLocation} searchable compact />
          <ErrorBanner message={error} />
          <Button className="w-full" size="lg" disabled={!location} onClick={() => { setError(null); setStep(1) }}>
            Next: interests
          </Button>
          {!profile && (
            <p className="text-center text-[14px] font-bold text-pencil-gray">
              Selling something? <Link to="/vendor" className="text-spark-blue underline">Open a shop</Link>
            </p>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <h1 className="text-[40px] leading-[1.05]">What are you into?</h1>
          <p className="text-[16px] leading-relaxed text-pencil-gray">Pick up to {MAX_STORE_TAGS}. Matching products come first; everything nearby still shows.</p>
          <div className="flex flex-wrap gap-2">
            {STORE_TAGS.map((t) => {
              const on = interests.includes(t)
              const full = !on && interests.length >= MAX_STORE_TAGS
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggle(t)}
                  disabled={full}
                  className={cx(
                    'rounded px-3 py-2 font-mono text-[12px] tracking-[0.053em] uppercase ring-1 transition',
                    on ? 'bg-eager-green text-white ring-eager-green' : 'bg-transparent text-charcoal ring-line hover:ring-spark-blue',
                    full && 'opacity-40',
                  )}
                >
                  {t}
                </button>
              )
            })}
          </div>
          <ErrorBanner message={error} />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep(0)}>Back</Button>
            <Button className="flex-1" size="lg" loading={busy} onClick={() => void finish()}>
              Start swiping
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
