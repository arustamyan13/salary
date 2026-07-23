// Supabase Edge Function: daily pay reminders via Web Push
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET
// Optional: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import webpush from 'npm:web-push@3.6.7'

type ReminderType = 'today' | 'tomorrow'

type EmployeeRow = {
  id: string
  user_id: string
  name: string
  salary: number
  pay_day: string
}

type SubscriptionRow = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

function formatRub(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

function buildMessage(employee: EmployeeRow, type: ReminderType) {
  const money = formatRub(Number(employee.salary))
  if (type === 'tomorrow') {
    return {
      title: 'Выплата завтра',
      body: `Завтра необходимо выплатить ${employee.name} — ${money}`,
    }
  }
  return {
    title: 'Выплата сегодня',
    body: `Сегодня необходимо выплатить ${employee.name} — ${money}`,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const cronSecret = Deno.env.get('CRON_SECRET')
    if (cronSecret) {
      const provided = req.headers.get('x-cron-secret')
      if (provided !== cronSecret) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')!
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

    const supabase = createClient(supabaseUrl, serviceKey)

    const timeZone = Deno.env.get('TZ') || 'Europe/Moscow'
    const todayIso = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())

    const tomorrowDate = new Date(`${todayIso}T12:00:00Z`)
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1)
    const tomorrowIso = tomorrowDate.toISOString().slice(0, 10)

    // today, tomorrow, or overdue (still unpaid)
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, user_id, name, salary, pay_day')
      .or(`pay_day.eq.${todayIso},pay_day.eq.${tomorrowIso},pay_day.lt.${todayIso}`)

    if (empError) throw empError

    const list = (employees ?? []) as EmployeeRow[]
    if (list.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No reminders today' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userIds = [...new Set(list.map((e) => e.user_id))]
    const { data: subs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .in('user_id', userIds)

    if (subError) throw subError

    const subscriptions = (subs ?? []) as SubscriptionRow[]
    const byUser = new Map<string, SubscriptionRow[]>()
    for (const sub of subscriptions) {
      const arr = byUser.get(sub.user_id) ?? []
      arr.push(sub)
      byUser.set(sub.user_id, arr)
    }

    let sent = 0
    const failures: string[] = []

    for (const employee of list) {
      const type: ReminderType = employee.pay_day === tomorrowIso ? 'tomorrow' : 'today'
      const payload = buildMessage(employee, type)
      const userSubs = byUser.get(employee.user_id) ?? []

      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({
              title: payload.title,
              body: payload.body,
              data: { employeeId: employee.id, url: './' },
            }),
          )
          sent += 1
        } catch (err) {
          const statusCode = (err as { statusCode?: number })?.statusCode
          failures.push(`${sub.id}:${statusCode ?? 'error'}`)
          // Gone / expired subscription
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          }
        }
      }
    }

    return new Response(JSON.stringify({ sent, failures, checked: list.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
