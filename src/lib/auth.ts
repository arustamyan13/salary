/** Single-owner app credentials and lockout helpers. */

export const APP_LOGIN = import.meta.env.VITE_APP_LOGIN || 'admin'
export const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD || 'Arman1982'

/** Fixed owner id for Supabase rows (single-user mode, no Supabase Auth). */
export const OWNER_ID = '00000000-0000-4000-8000-000000000001'

export const SESSION_KEY = 'salary_auth_session'
export const LOCKOUT_KEY = 'salary_auth_lockout'

export const MAX_ATTEMPTS = 3
export const LOCKOUT_MS = 30 * 60 * 1000

export type AppUser = {
  login: string
}

type LockoutState = {
  attempts: number
  lockedUntil: number | null
}

export function readSession(): AppUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AppUser
    if (parsed?.login === APP_LOGIN) return parsed
    return null
  } catch {
    return null
  }
}

export function writeSession(user: AppUser) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function readLockout(): LockoutState {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY)
    if (!raw) return { attempts: 0, lockedUntil: null }
    const parsed = JSON.parse(raw) as LockoutState
    return {
      attempts: Number(parsed.attempts) || 0,
      lockedUntil: parsed.lockedUntil ? Number(parsed.lockedUntil) : null,
    }
  } catch {
    return { attempts: 0, lockedUntil: null }
  }
}

export function writeLockout(state: LockoutState) {
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify(state))
}

export function clearLockout() {
  localStorage.removeItem(LOCKOUT_KEY)
}

export function getLockRemainingMs(now = Date.now()): number {
  const { lockedUntil } = readLockout()
  if (!lockedUntil) return 0
  return Math.max(0, lockedUntil - now)
}

export function formatLockRemaining(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min <= 0) return `${sec} сек.`
  return `${min} мин. ${String(sec).padStart(2, '0')} сек.`
}
