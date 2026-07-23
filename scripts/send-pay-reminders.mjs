/**
 * Daily Web Push reminders (GitHub Actions / local cron).
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 */
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabaseUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const vapidPublic = process.env.VAPID_PUBLIC_KEY
const vapidPrivate = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'

if (!supabaseUrl || !serviceKey || !vapidPublic || !vapidPrivate) {
  console.error('Missing required environment variables')
  process.exit(1)
}

webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

const supabase = createClient(supabaseUrl, serviceKey)

function formatRub(amount) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

function todayIsoInTz(timeZone = 'Europe/Moscow') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function addDaysIso(iso, days) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const today = todayIsoInTz(process.env.TZ || 'Europe/Moscow')
const tomorrow = addDaysIso(today, 1)

const { data: employees, error: empError } = await supabase
  .from('employees')
  .select('id, user_id, name, salary, pay_day')
  .or(`pay_day.eq.${today},pay_day.eq.${tomorrow},pay_day.lt.${today}`)

if (empError) {
  console.error(empError)
  process.exit(1)
}

const list = employees ?? []
if (list.length === 0) {
  console.log('No reminders')
  process.exit(0)
}

const userIds = [...new Set(list.map((e) => e.user_id))]
const { data: subs, error: subError } = await supabase
  .from('push_subscriptions')
  .select('id, user_id, endpoint, p256dh, auth')
  .in('user_id', userIds)

if (subError) {
  console.error(subError)
  process.exit(1)
}

const byUser = new Map()
for (const sub of subs ?? []) {
  const arr = byUser.get(sub.user_id) ?? []
  arr.push(sub)
  byUser.set(sub.user_id, arr)
}

let sent = 0

for (const employee of list) {
  const isTomorrow = employee.pay_day === tomorrow
  const body = isTomorrow
    ? `Завтра необходимо выплатить ${employee.name} — ${formatRub(Number(employee.salary))}`
    : `Сегодня необходимо выплатить ${employee.name} — ${formatRub(Number(employee.salary))}`
  const title = isTomorrow ? 'Выплата завтра' : 'Выплата сегодня'

  for (const sub of byUser.get(employee.user_id) ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title,
          body,
          data: { employeeId: employee.id, url: './' },
        }),
      )
      sent += 1
    } catch (err) {
      const statusCode = err?.statusCode
      console.warn('Push failed', sub.id, statusCode || err.message)
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }
}

console.log(`Sent ${sent} notifications for ${list.length} employees`)
