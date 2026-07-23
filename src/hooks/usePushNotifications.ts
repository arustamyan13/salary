import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { OWNER_ID } from '../lib/auth'

const MAX_PUSH_CONNECTIONS = 2
export const DEVICE_LIMIT_MESSAGE =
  'Ограничение по устройствам: можно подключить только 2 устройства'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

async function subscriptionToKeys(subscription: PushSubscription) {
  const json = subscription.toJSON()
  const keys = json.keys
  if (!keys?.p256dh || !keys?.auth || !json.endpoint) {
    throw new Error('Некорректная Push Subscription')
  }
  return {
    endpoint: json.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  }
}

export function usePushNotifications() {
  const { user } = useAuth()
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deviceLimitReached, setDeviceLimitReached] = useState(false)
  const autoTried = useRef(false)

  useEffect(() => {
    const ok =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window

    setSupported(ok)
    if (ok) setPermission(Notification.permission)
  }, [])

  const subscribe = useCallback(async () => {
    if (!user) {
      setError('Войдите в аккаунт')
      return false
    }

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      setError('Не задан VITE_VAPID_PUBLIC_KEY')
      return false
    }

    setLoading(true)
    setError(null)
    setDeviceLimitReached(false)

    let createdNewSubscription = false

    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        setError('Разрешение на уведомления не получено')
        setLoading(false)
        return false
      }

      const reg = await navigator.serviceWorker.ready
      let subscription = await reg.pushManager.getSubscription()

      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        })
        createdNewSubscription = true
      }

      const keys = await subscriptionToKeys(subscription)

      const { data: existing, error: listError } = await supabase
        .from('push_subscriptions')
        .select('endpoint')
        .eq('user_id', OWNER_ID)

      if (listError) throw new Error(listError.message)

      const otherDevices = (existing ?? []).filter((row) => row.endpoint !== keys.endpoint)
      if (otherDevices.length >= MAX_PUSH_CONNECTIONS) {
        if (createdNewSubscription) {
          await subscription.unsubscribe()
        }
        setDeviceLimitReached(true)
        setError(DEVICE_LIMIT_MESSAGE)
        setSubscribed(false)
        setLoading(false)
        return false
      }

      const { error: upsertError } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: OWNER_ID,
          endpoint: keys.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: 'endpoint' },
      )

      if (upsertError) throw new Error(upsertError.message)

      setSubscribed(true)
      setLoading(false)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка подписки')
      setLoading(false)
      return false
    }
  }, [user])

  useEffect(() => {
    if (!supported || !user || autoTried.current) return
    autoTried.current = true

    let cancelled = false

    async function bootstrap() {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (cancelled) return

        if (sub) {
          const endpoint = sub.endpoint
          const { data } = await supabase
            .from('push_subscriptions')
            .select('endpoint')
            .eq('user_id', OWNER_ID)

          const saved = (data ?? []).some((row) => row.endpoint === endpoint)
          if (saved) {
            setSubscribed(true)
            setPermission(Notification.permission)
            return
          }

          // Local subscription exists but not in DB — try register (may hit limit)
          await subscribe()
          return
        }

        if (Notification.permission === 'denied') {
          setPermission('denied')
          return
        }

        await subscribe()
      } catch {
        if (!cancelled) setSubscribed(false)
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [supported, user, subscribe])

  const sendTestNotification = useCallback(async () => {
    setError(null)
    try {
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission()
        setPermission(perm)
        if (perm !== 'granted') {
          setError('Нет разрешения на уведомления')
          return false
        }
      }

      const reg = await navigator.serviceWorker.ready
      await reg.showNotification('Зарплата — тест', {
        body: 'Пробное уведомление: всё работает',
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        tag: 'salary-test',
        data: { url: './' },
      })
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось показать уведомление')
      return false
    }
  }, [])

  return {
    supported,
    permission,
    subscribed,
    loading,
    error,
    deviceLimitReached,
    subscribe,
    sendTestNotification,
  }
}
