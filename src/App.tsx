import { useCallback, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SplashScreen } from './components/SplashScreen'
import { AuthProvider } from './context/AuthContext'
import { EmployeesProvider } from './context/EmployeesContext'
import { EditEmployeePage } from './pages/EditEmployeePage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const finishSplash = useCallback(() => setShowSplash(false), [])

  return (
    <AuthProvider>
      <EmployeesProvider>
        {showSplash && <SplashScreen onFinished={finishSplash} />}
        <div className={showSplash ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/employee/:id" element={<EditEmployeePage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </div>
      </EmployeesProvider>
    </AuthProvider>
  )
}
