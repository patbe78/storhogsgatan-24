import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/shared/layouts/AppShell'
import { AuthProvider, LoginPage, ProtectedRoute, ResetPasswordPage } from '@/modules/auth'
import { DashboardPage } from '@/modules/dashboard'
import { CalendarPage } from '@/modules/calendar'
import { LaundryPage } from '@/modules/laundry'
import { ShoppingPage } from '@/modules/shopping'
import { SettingsPage } from '@/modules/settings'

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/aterstall-losenord" element={<ResetPasswordPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="kalender" element={<CalendarPage />} />
              <Route path="tvattbokning" element={<LaundryPage />} />
              <Route path="inkopslista" element={<ShoppingPage />} />
              <Route path="installningar" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
