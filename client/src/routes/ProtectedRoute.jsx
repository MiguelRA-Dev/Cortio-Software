import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <span className="text-sm text-muted">Cargando…</span>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const isCustomer = !loading && user?.role === 'customer'

  // Customers aren't allowed into the staff panel. Log them out and navigate away
  // explicitly instead of just <Navigate to="/login">: /login redirects straight
  // back to /app whenever a session exists, which would bounce forever otherwise.
  useEffect(() => {
    if (isCustomer) {
      logout()
      navigate('/login', {
        replace: true,
        state: { notice: 'Esta cuenta es de un cliente. Usa el link de tu barbería para agendar una cita.' },
      })
    }
  }, [isCustomer, logout, navigate])

  if (loading || isCustomer) {
    return <Loading />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
