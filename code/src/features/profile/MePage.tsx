import { useState, type FormEvent } from 'react'
import { AnimatePresence } from 'motion/react'
import { Link } from 'react-router'
import { Avatar, Button, ErrorBanner, Input, PageHeader } from '@/components/ui'
import { Bell, Heart, HeartPlus, ICON, LogOut, MapPin, Store } from '@/components/icons'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth, useSession } from '@/features/auth/AuthProvider'
import { BuySwipesSheet, Price } from '@/features/economy/BuySwipesSheet'
import { updateProfile } from '@/lib/db'
import { isApp } from '@/lib/platform'
import { SUPER_BUNDLES, SWIPE_BUNDLES } from '@/lib/types'

export function MePage() {
  const { user, profile } = useSession()
  const { signOut } = useAuth()
  const [name, setName] = useState(profile.displayName)
  const [username, setUsername] = useState(profile.username ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [email, setEmail] = useState(profile.email ?? user.email ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [buyOpen, setBuyOpen] = useState<'swipes' | 'superSwipes' | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await updateProfile(profile.uid, { displayName: name.trim(), username: username.trim().toLowerCase(), phone: phone.trim(), email: email.trim() })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-4 pt-[calc(var(--safe-top)+72px)] pb-6">
      <PageHeader eyebrow="Profile" title={profile.displayName} subtitle={`@${profile.username ?? 'user'}`} right={<Avatar name={profile.displayName} url={profile.avatarUrl} size={48} />} />

      <section className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setBuyOpen('swipes')} className="border border-line p-3 text-left">
          <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted uppercase"><Heart {...ICON} size={14} /> Swipes</p>
          <p className="mt-1 text-[29px] leading-none">{profile.swipes}</p>
          <p className="mt-1 font-mono text-[11px] text-accent-text uppercase">Buy more</p>
        </button>
        <button type="button" onClick={() => setBuyOpen('superSwipes')} className="border border-line p-3 text-left">
          <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted uppercase"><HeartPlus {...ICON} size={14} className="text-accent-text" /> Super</p>
          <p className="mt-1 text-[29px] leading-none">{profile.superSwipes}</p>
          <p className="mt-1 font-mono text-[11px] text-accent-text uppercase">Buy more</p>
        </button>
      </section>
      <p className="mt-2 font-mono text-[11px] text-muted uppercase">5 free swipes a day{isApp() ? ' · app bonus applied' : ' · get the app for 2 free super swipes'}</p>

      <section className="mt-5 border border-line p-4">
        <p className="label mb-3">Bundles</p>
        <ul className="space-y-1.5 font-mono text-[12px]">
          {SWIPE_BUNDLES.map((b) => <li key={`s${b.qty}`} className="flex justify-between"><span>{b.qty} swipes</span><Price bundle={b} /></li>)}
          {SUPER_BUNDLES.map((b) => <li key={`p${b.qty}`} className="flex justify-between"><span>{b.qty} super swipes</span><Price bundle={b} /></li>)}
        </ul>
      </section>

      <form onSubmit={onSubmit} className="mt-5 space-y-3 border border-line p-4">
        <p className="label">Details</p>
        <Input label="Name" name="displayName" required minLength={2} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Username" name="username" maxLength={20} value={username} onChange={(e) => setUsername(e.target.value)} />
        <Input label="Contact number" name="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <ErrorBanner message={error} />
        <Button type="submit" loading={busy} variant="secondary">{saved ? 'Saved' : 'Save'}</Button>
      </form>

      <div className="mt-5 divide-y divide-line border border-line">
        <Link to="/shopper/setup" className="flex items-center gap-3 p-4 text-[14px] text-ink">
          <MapPin {...ICON} /> <span className="flex-1">Area &amp; interests</span>
          <span className="font-mono text-[11px] text-muted uppercase">{profile.location?.area ?? profile.location?.address?.split(',')[0] ?? 'not set'}</span>
        </Link>
        <Link to="/me/alerts" className="flex items-center gap-3 p-4 text-[14px] text-ink"><Bell {...ICON} /> <span className="flex-1">Alerts</span></Link>
        <Link to={profile.hasShop ? '/vendor/home' : '/vendor'} className="flex items-center gap-3 p-4 text-[14px] text-ink"><Store {...ICON} /> <span className="flex-1">{profile.hasShop ? 'Switch to seller' : 'Open a shop'}</span></Link>
        <div className="flex items-center gap-3 p-4 text-[14px] text-ink"><span className="flex-1">Appearance</span><ThemeToggle /></div>
        <Link to="/me/metrics" className="flex items-center gap-3 p-4 text-[14px] text-muted"><span className="flex-1">Evaluation metrics</span></Link>
        <button type="button" onClick={() => void signOut()} className="flex w-full items-center gap-3 p-4 text-left text-[14px] text-ink"><LogOut {...ICON} /> Log out</button>
      </div>

      <AnimatePresence>{buyOpen && <BuySwipesSheet kind={buyOpen} onClose={() => setBuyOpen(null)} />}</AnimatePresence>
    </div>
  )
}
