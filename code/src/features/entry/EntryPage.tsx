import { useNavigate } from 'react-router'
import { setMode } from '@/lib/mode'

export function EntryPage() {
  const navigate = useNavigate()
  function choose(mode: 'shopper' | 'vendor') {
    setMode(mode)
    navigate(mode === 'shopper' ? '/feed' : '/vendor', { replace: true })
  }
  return (
    <div className="flex min-h-dvh flex-col justify-center bg-linear-to-b from-brand-50 to-white px-6 py-12 pt-safe">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-4xl text-white shadow-lg shadow-brand-200">◫</div>
          <h1 className="text-4xl font-black tracking-tight text-neutral-900">Window</h1>
          <p className="mt-2 text-sm text-neutral-500">Swipe through what local sellers have. Chat directly. No carts, no clutter.</p>
        </div>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => choose('shopper')}
            className="flex w-full items-center gap-4 rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-black/5 transition hover:ring-brand-300 active:scale-[0.99]"
          >
            <span className="text-3xl">🛍️</span>
            <span>
              <span className="block text-lg font-bold">I'm shopping</span>
              <span className="block text-sm text-neutral-500">Start swiping right away. Log in only when you like something.</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => choose('vendor')}
            className="flex w-full items-center gap-4 rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-black/5 transition hover:ring-brand-300 active:scale-[0.99]"
          >
            <span className="text-3xl">🏪</span>
            <span>
              <span className="block text-lg font-bold">I'm a seller</span>
              <span className="block text-sm text-neutral-500">Set up your shop in two minutes and start listing products.</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
