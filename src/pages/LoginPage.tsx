import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { formatLockRemaining } from '../lib/auth'

export function LoginPage() {
  const { signIn, user, loading, lockRemainingMs } = useAuth()
  const navigate = useNavigate()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const locked = lockRemainingMs > 0

  useEffect(() => {
    if (!locked) return
    setError(`Слишком много попыток. Повторите через ${formatLockRemaining(lockRemainingMs)}`)
  }, [locked, lockRemainingMs])

  if (!loading && user) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (locked) return

    setSubmitting(true)
    setError(null)
    const result = await signIn(login, password)
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <AuthShell title="Вход" subtitle="Личный доступ к учёту зарплаты">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-zinc-500">Логин</span>
          <input
            type="text"
            required
            autoComplete="username"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="ios-input"
            placeholder="Логин"
            disabled={locked || submitting}
            autoFocus
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-zinc-500">Пароль</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="ios-input"
            placeholder="Пароль"
            disabled={locked || submitting}
          />
        </label>
        {error && (
          <p className="rounded-2xl bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting || locked}
          className="ios-button-primary w-full disabled:opacity-60"
        >
          {locked
            ? `Повтор через ${formatLockRemaining(lockRemainingMs)}`
            : submitting
              ? 'Вход…'
              : 'Войти'}
        </button>
      </form>
    </AuthShell>
  )
}

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center bg-white px-5 py-10">
      <div className="mb-8">
        <p className="text-[13px] font-medium text-zinc-500">Зарплата</p>
        <h1 className="mt-1 text-[32px] font-bold tracking-tight text-zinc-900">{title}</h1>
        <p className="mt-2 text-[15px] text-zinc-500">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}
