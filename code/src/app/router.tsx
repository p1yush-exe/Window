import { BrowserRouter, Route, Routes } from 'react-router'
import { AppShell } from './layout/AppShell'
import { OnboardingGate, PublicOnly, RequireAuth, RequireRole, RoleHome } from './guards'
import { LoginPage, SignupPage } from '@/features/auth/AuthPages'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { FeedPage } from '@/features/feed/FeedPage'
import { LikedPage } from '@/features/matches/LikedPage'
import { ChatsPage } from '@/features/chat/ChatsPage'
import { ChatPage } from '@/features/chat/ChatPage'
import { DashboardPage } from '@/features/vendor/DashboardPage'
import { ProductFormPage } from '@/features/vendor/ProductFormPage'
import { StoreSettingsPage } from '@/features/vendor/StoreSettingsPage'
import { StorePage } from '@/features/vendor/StorePage'
import { ProductPage } from '@/features/products/ProductPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { MetricsPage } from '@/features/metrics/MetricsPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>
        <Route element={<OnboardingGate />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<RoleHome />} />
            <Route element={<RequireRole role="buyer" />}>
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/liked" element={<LikedPage />} />
            </Route>
            <Route element={<RequireRole role="vendor" />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/dashboard/new" element={<ProductFormPage />} />
              <Route path="/dashboard/edit/:productId" element={<ProductFormPage />} />
              <Route path="/dashboard/store" element={<StoreSettingsPage />} />
            </Route>
            <Route path="/chats" element={<ChatsPage />} />
            <Route path="/chats/:matchId" element={<ChatPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/store/:vendorId" element={<StorePage />} />
            <Route path="/product/:productId" element={<ProductPage />} />
            <Route path="/metrics" element={<MetricsPage />} />
            <Route path="*" element={<RoleHome />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
