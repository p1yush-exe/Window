import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

export const isNative = () => Capacitor.isNativePlatform()

export async function haptic(style: 'light' | 'medium' = 'light') {
  if (!isNative()) return
  try {
    await Haptics.impact({ style: style === 'light' ? ImpactStyle.Light : ImpactStyle.Medium })
  } catch {
    /* no haptics available */
  }
}
