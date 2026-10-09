import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { ShopperShell } from './layout/ShopperShell'
import { VendorShell } from './layout/VendorShell'
import { OnboardingGate, PublicOnly, RequireProfile, RequireVendor, RoleHome, ShellGate } from './guards'
import { LoginPage } from '@/features/auth/AuthPages'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { ShopperSetupPage } from '@/features/entry/ShopperSetupPage'
import { EntryPage } from '@/features/entry/EntryPage'
import { FeedPage } from '@/features/feed/FeedPage'
import { BagPage } from '@/features/bag/BagPage'
import { ChatPage } from '@/features/chat/ChatPage'
import { MePage } from '@/features/profile/MePage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { MetricsPage } from '@/features/metrics/MetricsPage'
import { ShopPage } from '@/features/shop/ShopPage'
import { ProductPage } from '@/features/products/ProductPage'
import { VendorLandingPage } from '@/features/vendor/VendorLandingPage'
import { VendorSetupPage } from '@/features/vendor/VendorSetupPage'
import { VendorDownloadPage } from '@/features/vendor/VendorDownloadPage'
import { VendorHomePage } from '@/features/vendor/VendorHomePage'
import { NewProductPage } from '@/features/vendor/NewProductPage'
import { ShopManagePage } from '@/features/vendor/ShopManagePage'
import { ShopEditPage } from '@/features/vendor/ShopEditPage'
import { VendorMePage } from '@/features/vendor/VendorMePage'
import { EditProductPage } from '@/features/vendor/EditProductPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<RoleHome />} />
        <Route element={<PublicOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<Navigate to="/" replace />} />
        </Route>
        <Route element={<OnboardingGate />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>
        <Route path="/welcome" element={<EntryPage />} />
        <Route path="/shopper/setup" element={<ShopperSetupPage />} />
        <Route path="/vendor" element={<VendorLandingPage />} />
        <Route path="/vendor/setup" element={<VendorSetupPage />} />
        <Route path="/vendor/download" element={<VendorDownloadPage />} />

        <Route element={<ShellGate />}>
          <Route element={<ShopperShell />}>
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/shop/:shopId" element={<ShopPage />} />
            <Route path="/product/:productId" element={<ProductPage />} />
            <Route element={<RequireProfile />}>
              <Route path="/bag" element={<BagPage />} />
              <Route path="/bag/chat/:matchId" element={<ChatPage />} />
              <Route path="/me" element={<MePage />} />
              <Route path="/me/alerts" element={<NotificationsPage />} />
              <Route path="/me/metrics" element={<MetricsPage />} />
            </Route>
          </Route>

          <Route element={<RequireVendor />}>
            <Route element={<VendorShell />}>
              <Route path="/vendor/home" element={<VendorHomePage />} />
              <Route path="/vendor/new" element={<NewProductPage />} />
              <Route path="/vendor/product/:productId" element={<EditProductPage />} />
              <Route path="/vendor/shop" element={<ShopManagePage />} />
              <Route path="/vendor/shop/new" element={<ShopEditPage />} />
              <Route path="/vendor/shop/:shopId" element={<ShopEditPage />} />
              <Route path="/vendor/chat/:matchId" element={<ChatPage />} />
              <Route path="/vendor/me" element={<VendorMePage />} />
            </Route>
          </Route>

          {/* Old paths */}
          <Route path="/liked" element={<Navigate to="/bag" replace />} />
          <Route path="/chats" element={<Navigate to="/bag" replace />} />
          <Route path="/chats/:matchId" element={<Navigate to="/bag" replace />} />
          <Route path="/profile" element={<Navigate to="/me" replace />} />
          <Route path="/dashboard/*" element={<Navigate to="/vendor/home" replace />} />
          <Route path="/notifications" element={<Navigate to="/me/alerts" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
