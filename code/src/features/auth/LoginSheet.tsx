import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, ErrorBanner, Input } from '@/components/ui'
import { GoogleButton } from '@/components/GoogleButton'
import { friendlyAuthError, useAuth } from './AuthProvider'

interface Props {
  open: boolean
  onClose: () => void
  onDone: () => void
  title?: string
  body?: string
}

/** Bottom-sheet login / sign-up for shoppers. Creates a buyer profile on sign-up. */
export function LoginSheet({ open, onClose, onDone, title = 'Log in to like this', body = 'Liking a product opens a chat with the seller, so we need to know who you are.' }: Props) {
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState<'login' | 'signup'>('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (tab === 'signup') await signUp(email.trim(), password, 'buyer', name.trim())
      else await signIn(email.trim(), password)
      onDone()
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+var(--safe-bottom))] md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded bg-[#ececec] md:hidden" />
            <h2 className="text-xl font-normal">{title}</h2>
            <p className="mt-1 text-sm text-pencil-gray">{body}</p>
            <div className="mt-4">
              <GoogleButton
                role="buyer"
                onDone={(r) => {
                  if (r.existingRole === 'vendor') setError('That Google account is a seller account. Sellers use the seller side of the app.')
                  else onDone()
                }}
              />
            </div>
            <div className="my-3 flex items-center gap-3 font-mono text-[11px] text-pencil-gray uppercase"><span className="h-px flex-1 bg-faded-gray" />or email<span className="h-px flex-1 bg-faded-gray" /></div>
            <div className="flex rounded-xl bg-[#f7f7f7] p-1 text-sm font-semibold">
              {(['signup', 'login'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)} className={`flex-1 rounded-lg py-2 ${tab === t ? 'bg-white' : 'text-pencil-gray'}`}>
                  {t === 'signup' ? 'New here' : 'I have an account'}
                </button>
              ))}
            </div>
            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              {tab === 'signup' && <Input label="Your name" name="name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />}
              <Input label="Email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input label="Password" name="password" type="password" autoComplete={tab === 'signup' ? 'new-password' : 'current-password'} minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
              <ErrorBanner message={error} />
              <Button type="submit" className="w-full" loading={busy}>
                {tab === 'signup' ? 'Create account & like' : 'Log in & like'}
              </Button>
              <button type="button" onClick={onClose} className="w-full text-center text-sm text-pencil-gray">
                Not now
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
