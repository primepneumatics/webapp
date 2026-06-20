import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { CustomerList } from './pages/customers/CustomerList'
import { CustomerNew } from './pages/customers/CustomerNew'
import { CustomerDetail } from './pages/customers/CustomerDetail'
import { CustomerEdit } from './pages/customers/CustomerEdit'
import { CustomerReports } from './pages/customers/CustomerReports'
import { ReportNew } from './pages/reports/ReportNew'
import { ReportView } from './pages/reports/ReportView'
import { InviteUser } from './pages/admin/InviteUser'
import { SparePartsList } from './pages/admin/SparePartsList'
import { ServiceTypesList } from './pages/admin/ServiceTypesList'
import { AdminSettings } from './pages/admin/AdminSettings'
import { Profile } from './pages/Profile'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute><CustomerList /></ProtectedRoute>} />
        <Route path="/customers/new" element={<ProtectedRoute><CustomerNew /></ProtectedRoute>} />
        <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} />
        <Route path="/customers/:id/edit" element={<ProtectedRoute><CustomerEdit /></ProtectedRoute>} />
        <Route path="/customers/:id/reports" element={<ProtectedRoute><CustomerReports /></ProtectedRoute>} />
        <Route path="/customers/:id/reports/new" element={<ProtectedRoute><ReportNew /></ProtectedRoute>} />
        <Route path="/reports/:id" element={<ProtectedRoute><ReportView /></ProtectedRoute>} />
        <Route path="/admin/invite" element={<ProtectedRoute><InviteUser /></ProtectedRoute>} />
        <Route path="/admin/spare-parts" element={<ProtectedRoute><SparePartsList /></ProtectedRoute>} />
        <Route path="/admin/service-types" element={<ProtectedRoute><ServiceTypesList /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
