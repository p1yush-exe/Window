import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Avatar, Button, ErrorBanner, FullPageSpinner, Input, PageHeader } from '@/components/ui'
import { ArrowLeftRight, ICON, LogOut, Plus, Store, Ticket } from '@/components/icons'
import { useAuth, useSession } from '@/features/auth/AuthProvider'
import { updateProfile, updateVendor, uploadsLeft } from '@/lib/db'
import { setMode } from '@/lib/mode'
import { useOwnerShops, useVendor } from './useVendor'

/** Bottom-right profile: credentials, shops under the owner, payment ids. */
export function VendorMePage() {
  const { profile } = useSession()
  const { signOut } = useAuth()
  const vendor = useVendor(profile.uid)
  const { shops } = useOwnerShops(profile.uid)
  const [form, setForm] = useState<{ ownerName: string; ownerEmail: string; ownerPhone: string; upi: string; bank: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (vendor === undefined || shops === null) return <FullPageSpinner />
  if (!vendor) return <ErrorBanner message="Seller profile missing." />
  const f = form ?? { ownerName: vendor.ownerName, ownerEmail: vendor.ownerEmail, ownerPhone: vendor.ownerPhone, upi: vendor.paymentIds?.upi ?? '', bank: vendor.paymentIds?.bank ?? '' }
  const set = (k: keyof typeof f, v: string) => setForm({ ...f, [k]: v })

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await updateVendor(profile.uid, {
        ownerName: f.ownerName.trim(),
        ownerEmail: f.ownerEmail.trim(),
        ownerPhone: f.ownerPhone.trim(),
        phoneVerified: f.ownerPhone.trim() === vendor!.ownerPhone ? vendor!.phoneVerified : false,
        emailVerified: f.ownerEmail.trim() === vendor!.ownerEmail ? vendor!.emailVerified : false,
        paymentIds: { upi: f.upi.trim(), bank: f.bank.trim() },
      })
      await updateProfile(profile.uid, { displayName: f.ownerName.trim(), phone: f.ownerPhone.trim(), email: f.ownerEmail.trim() })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-4 pb-6">
      <PageHeader eyebrow="Seller profile" title={vendor.ownerName} subtitle={`${vendor.tokens} tokens · ${uploadsLeft(vendor)} uploads left`} right={<Avatar name={vendor.ownerName} url={profile.avatarUrl} size={48} />} />

      <form onSubmit={submit} className="space-y-3 border-2 border-faded-gray p-4">
        <p className="label">Credentials</p>
        <Input label="Name" name="ownerName" required value={f.ownerName} onChange={(e) => set('ownerName', e.target.value)} />
        <Input label="Email" name="ownerEmail" type="email" required value={f.ownerEmail} onChange={(e) => set('ownerEmail', e.target.value)} hint={vendor.emailVerified ? 'verified' : 'not verified'} />
        <Input label="Phone" name="ownerPhone" type="tel" value={f.ownerPhone} onChange={(e) => set('ownerPhone', e.target.value)} hint={vendor.phoneVerified ? 'verified' : 'not verified'} />
        <p className="label pt-2">Payment ids</p>
        <Input label="UPI id" name="upi" value={f.upi} onChange={(e) => set('upi', e.target.value)} placeholder="name@upi" />
        <Input label="Bank account (for net banking)" name="bank" value={f.bank} onChange={(e) => set('bank', e.target.value)} placeholder="Account number · IFSC" />
        <ErrorBanner message={error} />
        <Button type="submit" variant="secondary" loading={busy}>{saved ? 'Saved' : 'Save'}</Button>
      </form>

      <section className="mt-5 border-2 border-faded-gray">
        <div className="flex items-center justify-between p-4">
          <p className="label">Shops under your name</p>
          <Link to="/vendor/shop/new" className="flex items-center gap-1 font-mono text-[12px] text-spark-blue uppercase"><Plus {...ICON} size={14} /> Add</Link>
        </div>
        <ul className="divide-y divide-faded-gray border-t border-faded-gray">
          {shops.map((s) => (
            <li key={s.id}>
              <Link to={`/vendor/shop/${s.id}`} className="flex items-center gap-3 p-4 text-[14px] text-charcoal">
                <Store {...ICON} /> <span className="flex-1">{s.name}</span>
                <span className="font-mono text-[11px] text-pencil-gray uppercase">{s.location?.area ?? ''}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-5 divide-y divide-faded-gray border-2 border-faded-gray">
        <Link to="/vendor/shop" className="flex items-center gap-3 p-4 text-[14px] text-charcoal"><Ticket {...ICON} /> <span className="flex-1">Tokens &amp; decorations</span></Link>
        <Link to="/feed" onClick={() => setMode('shopper')} className="flex items-center gap-3 p-4 text-[14px] text-charcoal"><ArrowLeftRight {...ICON} /> <span className="flex-1">Switch to shopping</span></Link>
        <button type="button" onClick={() => void signOut()} className="flex w-full items-center gap-3 p-4 text-left text-[14px] text-charcoal"><LogOut {...ICON} /> Log out</button>
      </div>
    </div>
  )
}
