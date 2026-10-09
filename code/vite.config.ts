/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'

import { readFileSync } from 'node:fs'
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // VITE_HTTPS=1 serves the dev server over a self-signed certificate so phones on the LAN get GPS and camera.
  plugins: [react(), tailwindcss(), ...(process.env.VITE_HTTPS ? [basicSsl()] : [])],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: true, port: 5173 },
  build: { sourcemap: false, chunkSizeWarningLimit: 1500 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.{ts,tsx}'],
  },
})
