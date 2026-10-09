import { useEffect, useState } from 'react'
import { getTheme, resolvedTheme, setTheme, type Theme } from '@/lib/theme'

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setT] = useState<Theme>(() => getTheme())
  const [resolved, setResolved] = useState<'dark' | 'light'>(() => resolvedTheme())
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setResolved(resolvedTheme())
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  function toggle() {
    const next: Theme = resolved === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setT(next)
    setResolved(next)
  }
  return (
    <button
      type="button"
      onClick={toggle}
      className={className ?? 'inline-flex items-center gap-2 rounded border border-line px-2.5 py-1.5 font-mono text-[11px] tracking-[0.06em] text-ink uppercase hover:border-ink'}
      aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}
      title={theme === 'system' ? 'Following system theme' : `${theme} theme`}
    >
      <span className={`h-2 w-2 rounded-full ${resolved === 'dark' ? 'bg-accent' : 'bg-ink'}`} />
      {resolved === 'dark' ? 'Dark' : 'Light'}
    </button>
  )
}
