export type AppMode = 'shopper' | 'vendor'

const KEY = 'window.mode'

export function getMode(): AppMode | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'shopper' || v === 'vendor' ? v : null
  } catch {
    return null
  }
}

export function setMode(mode: AppMode | null) {
  try {
    if (mode) localStorage.setItem(KEY, mode)
    else localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
