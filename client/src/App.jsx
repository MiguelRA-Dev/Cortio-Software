import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import AppLayout from './layouts/AppLayout'
import DashboardPage from './pages/owner/DashboardPage'
import AppointmentsPage from './pages/owner/AppointmentsPage'
import ServicesPage from './pages/owner/ServicesPage'
import TeamPage from './pages/owner/TeamPage'
import InventoryPage from './pages/owner/InventoryPage'
import SalesPage from './pages/owner/SalesPage'
import ExpensesPage from './pages/owner/ExpensesPage'
import PayrollPage from './pages/owner/PayrollPage'
import ReportsPage from './pages/owner/ReportsPage'
import SettingsPage from './pages/owner/SettingsPage'
import PublicBookingPage from './pages/booking/PublicBookingPage'
import CustomersPage from './pages/owner/CustomersPage'
import ProtectedRoute from './routes/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/b/:slug" element={<PublicBookingPage />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
