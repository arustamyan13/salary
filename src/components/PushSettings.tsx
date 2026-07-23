import { usePushNotifications } from '../hooks/usePushNotifications'

export function PushSettings() {
  const { supported, subscribed, loading, error, subscribe, unsubscribe, permission } =
    usePushNotifications()

  if (!supported) {
    return (
      <p className="rounded-2xl bg-zinc-50 px-3 py-2 text-[12px] text-zinc-500">
        Push-уведомления недоступны в этом браузере. На iPhone добавьте приложение на домашний
        экран (iOS 16.4+).
      </p>
    )
  }

  return (
    <div className="rounded-2xl bg-zinc-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold text-zinc-900">Напоминания о выплатах</p>
          <p className="mt-0.5 text-[12px] text-zinc-500">
            {subscribed
              ? 'Подписка активна'
              : permission === 'denied'
                ? 'Разрешение отклонено в настройках'
                : 'Получать push за день и в день выплаты'}
          </p>
        </div>
        <button
          type="button"
          disabled={loading || permission === 'denied'}
          onClick={() => void (subscribed ? unsubscribe() : subscribe())}
          className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-95 disabled:opacity-50 ${
            subscribed ? 'bg-zinc-200 text-zinc-700' : 'bg-zinc-900 text-white'
          }`}
        >
          {loading ? '…' : subscribed ? 'Отключить' : 'Включить'}
        </button>
      </div>
      {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
    </div>
  )
}
