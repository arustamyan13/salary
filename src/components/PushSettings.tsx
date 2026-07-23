import { useState } from 'react'
import { usePushNotifications } from '../hooks/usePushNotifications'

const TEST_KEY = 'salary_push_tested'

export function PushSettings() {
  const {
    supported,
    subscribed,
    loading,
    error,
    subscribe,
    sendTestNotification,
    permission,
  } = usePushNotifications()

  const [tested, setTested] = useState(() => {
    try {
      return localStorage.getItem(TEST_KEY) === '1'
    } catch {
      return false
    }
  })
  const [sendingTest, setSendingTest] = useState(false)

  if (!supported) return null

  // Fully subscribed and test already done — keep UI clean
  if (subscribed && tested) return null

  async function handleTest() {
    setSendingTest(true)
    await sendTestNotification()
    try {
      localStorage.setItem(TEST_KEY, '1')
    } catch {
      /* ignore */
    }
    setTested(true)
    setSendingTest(false)
  }

  return (
    <div className="rounded-2xl bg-zinc-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-zinc-900">Напоминания о выплатах</p>
          <p className="mt-0.5 text-[12px] text-zinc-500">
            {loading
              ? 'Запрос разрешения…'
              : subscribed
                ? 'Уведомления включены'
                : permission === 'denied'
                  ? 'Разрешение отклонено в настройках iPhone'
                  : 'Ожидание разрешения на уведомления'}
          </p>
        </div>
        {!subscribed && permission !== 'denied' && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void subscribe()}
            className="shrink-0 rounded-full bg-zinc-900 px-4 py-2 text-[13px] font-semibold text-white transition active:scale-95 disabled:opacity-50"
          >
            {loading ? '…' : 'Разрешить'}
          </button>
        )}
      </div>

      {subscribed && !tested && (
        <button
          type="button"
          disabled={sendingTest}
          onClick={() => void handleTest()}
          className="mt-3 w-full rounded-xl bg-white py-2.5 text-[13px] font-semibold text-zinc-800 shadow-sm transition active:scale-[0.98] disabled:opacity-60"
        >
          {sendingTest ? 'Отправка…' : 'Пробное уведомление'}
        </button>
      )}

      {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
    </div>
  )
}
