import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { AppRouter } from '@/app/router'
import { IntroGate, introPending } from '@/features/intro/IntroGate'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export default function App() {
  const [intro, setIntro] = useState(() => introPending())
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
        {intro && <IntroGate onDone={() => setIntro(false)} />}
      </AuthProvider>
    </QueryClientProvider>
  )
}
