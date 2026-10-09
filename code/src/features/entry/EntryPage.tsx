import { useNavigate } from 'react-router'
import { setMode } from '@/lib/mode'
import { ThemeToggle } from '@/components/ThemeToggle'

export function EntryPage() {
  const navigate = useNavigate()
  function choose(mode: 'shopper' | 'vendor') {
    setMode(mode)
    navigate(mode === 'shopper' ? '/shopper/setup' : '/vendor', { replace: true })
  }
  return (
    <div className="flex min-h-dvh flex-col bg-canvas px-5 pt-safe pb-safe">
      <header className="flex items-center justify-between py-4">
        <span className="font-mono text-[13px] tracking-[0.08em] text-ink uppercase">Window</span>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 flex-col justify-end pb-8">
        <p className="label mb-4">Local market · swipe to shop</p>
        <h1 className="max-w-[12ch] text-[56px] leading-[0.9] tracking-[-0.03em] text-ink md:text-[72px]">
          What's for sale near you.
        </h1>
        <p className="mt-5 max-w-md text-[18px] leading-[1.62] text-muted">
          Sellers in your area, one card at a time. Like something and you're talking to the person who made it.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => choose('shopper')}
            className="flex items-center justify-between rounded bg-accent px-[18px] py-[14px] font-mono text-[14px] tracking-[0.04em] text-on-accent uppercase hover:bg-accent-deep sm:min-w-56"
          >
            I'm shopping <span>→</span>
          </button>
          <button
            type="button"
            onClick={() => choose('vendor')}
            className="flex items-center justify-between rounded border border-line px-[18px] py-[14px] font-mono text-[14px] tracking-[0.04em] text-ink uppercase hover:border-ink sm:min-w-56"
          >
            I'm a seller <span>→</span>
          </button>
        </div>
        <p className="mt-6 font-mono text-[12px] text-muted">No account needed to browse.</p>
      </main>
    </div>
  )
}
