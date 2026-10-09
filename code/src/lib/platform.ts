import { Capacitor } from '@capacitor/core'

export const isApp = () => Capacitor.isNativePlatform()
export const isWeb = () => !Capacitor.isNativePlatform()

/** Public download link: the latest GitHub release carries the signed APK. */
export const APK_URL = 'https://github.com/p1yush-exe/Window/releases/latest'
