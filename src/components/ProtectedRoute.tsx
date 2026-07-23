import { Outlet } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { EmployeesProvider } from '../context/EmployeesContext'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <EmployeesProvider>
      <Outlet />
    </EmployeesProvider>
  )
}
