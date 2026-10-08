const read = (key: string, fallback = ''): string => {
  const v = import.meta.env[key] as string | undefined
  return v && v.length > 0 ? v : fallback
}

export const env = {
  firebase: {
    apiKey: read('VITE_FIREBASE_API_KEY', 'demo-key'),
    authDomain: read('VITE_FIREBASE_AUTH_DOMAIN', 'localhost'),
    projectId: read('VITE_FIREBASE_PROJECT_ID', 'window-dev'),
    storageBucket: read('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: read('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: read('VITE_FIREBASE_APP_ID'),
  },
  useEmulator: read('VITE_USE_EMULATOR') === 'true',
  cloudinary: {
    cloudName: read('VITE_CLOUDINARY_CLOUD_NAME'),
    uploadPreset: read('VITE_CLOUDINARY_UPLOAD_PRESET'),
  },
  get uploadsEnabled() {
    return this.cloudinary.cloudName.length > 0 && this.cloudinary.uploadPreset.length > 0
  },
  get configured() {
    return this.useEmulator || this.firebase.appId.length > 0
  },
}
