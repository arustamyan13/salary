import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  APP_LOGIN,
  APP_PASSWORD,
  MAX_ATTEMPTS,
  LOCKOUT_MS,
  clearLockout,
  clearSession,
  formatLockRemaining,
  getLockRemainingMs,
  readLockout,
  readSession,
  writeLockout,
  writeSession,
  type AppUser,
} from '../lib/auth'

type AuthContextValue = {
  user: AppUser | null
  loading: boolean
  lockRemainingMs: number
  signIn: (login: string, password: string) => Promise<{ error: string | null }>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [lockRemainingMs, setLockRemainingMs] = useState(0)

  useEffect(() => {
    setUser(readSession())
    setLockRemainingMs(getLockRemainingMs())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (lockRemainingMs <= 0) return

    const id = window.setInterval(() => {
      const left = getLockRemainingMs()
      setLockRemainingMs(left)
      if (left <= 0) {
        clearLockout()
      }
    }, 1000)

    return () => window.clearInterval(id)
  }, [lockRemainingMs])

  const signIn = useCallback(async (login: string, password: string) => {
    const remaining = getLockRemainingMs()
    if (remaining > 0) {
      setLockRemainingMs(remaining)
      return {
        error: `Слишком много попыток. Повторите через ${formatLockRemaining(remaining)}`,
      }
    }

    const normalizedLogin = login.trim()
    const ok = normalizedLogin === APP_LOGIN && password === APP_PASSWORD

    if (!ok) {
      const current = readLockout()
      const attempts = current.attempts + 1

      if (attempts >= MAX_ATTEMPTS) {
        const lockedUntil = Date.now() + LOCKOUT_MS
        writeLockout({ attempts, lockedUntil })
        setLockRemainingMs(LOCKOUT_MS)
        return {
          error: `Неверный логин или пароль. Доступ заблокирован на 30 минут.`,
        }
      }

      writeLockout({ attempts, lockedUntil: null })
      const left = MAX_ATTEMPTS - attempts
      return {
        error: `Неверный логин или пароль. Осталось попыток: ${left}`,
      }
    }

    clearLockout()
    setLockRemainingMs(0)
    const nextUser = { login: APP_LOGIN }
    writeSession(nextUser)
    setUser(nextUser)
    return { error: null }
  }, [])

  const signOut = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      lockRemainingMs,
      signIn,
      signOut,
    }),
    [user, loading, lockRemainingMs, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
