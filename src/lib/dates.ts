import {
  addMonths,
  differenceInCalendarDays,
  endOfWeek,
  format,
  getDate,
  isSameMonth,
  isWithinInterval,
  parseISO,
  setDate,
  startOfDay,
  startOfWeek,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import type { CardUrgency, Employee } from '../types/employee'

/** Next occurrence of pay_day relative to today (handles month rollover). */
export function getNextPayDate(payDayIso: string, from: Date = new Date()): Date {
  const payDay = startOfDay(parseISO(payDayIso))
  const today = startOfDay(from)

  if (payDay >= today) return payDay

  // Already passed: move to same day next month(s) until >= today
  let next = payDay
  while (next < today) {
    next = addMonths(next, 1)
    const originalDay = getDate(payDay)
    const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
    next = setDate(next, Math.min(originalDay, daysInMonth))
  }
  return next
}

export function daysUntilPay(payDayIso: string, from: Date = new Date()): number {
  return differenceInCalendarDays(getNextPayDate(payDayIso, from), startOfDay(from))
}

export function getCardUrgency(payDayIso: string, from: Date = new Date()): CardUrgency {
  const days = daysUntilPay(payDayIso, from)
  if (days <= 0) return 'urgent'
  if (days <= 7) return 'soon'
  return 'ok'
}

/** After payment: advance pay_day by one month, keeping day-of-month when possible. */
export function advancePayDay(payDayIso: string): string {
  const current = parseISO(payDayIso)
  const next = addMonths(current, 1)
  const originalDay = getDate(current)
  const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  const adjusted = setDate(next, Math.min(originalDay, daysInMonth))
  return format(adjusted, 'yyyy-MM-dd')
}

export function formatPayDate(payDayIso: string): string {
  return format(parseISO(payDayIso), 'd MMMM yyyy', { locale: ru })
}

export function formatSalary(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDaysLeft(days: number): string {
  if (days < 0) {
    const overdue = Math.abs(days)
    if (overdue === 1) return 'Просрочено на 1 день'
    if (overdue >= 2 && overdue <= 4) return `Просрочено на ${overdue} дня`
    return `Просрочено на ${overdue} дней`
  }
  if (days === 0) return 'Сегодня'
  if (days === 1) return 'Завтра'
  if (days >= 2 && days <= 4) return `Через ${days} дня`
  return `Через ${days} дней`
}

export function isPayInCurrentMonth(payDayIso: string, from: Date = new Date()): boolean {
  return isSameMonth(getNextPayDate(payDayIso, from), from)
}

export function isPayThisWeek(payDayIso: string, from: Date = new Date()): boolean {
  const next = getNextPayDate(payDayIso, from)
  const start = startOfWeek(from, { weekStartsOn: 1 })
  const end = endOfWeek(from, { weekStartsOn: 1 })
  return isWithinInterval(next, { start, end })
}

export function computeStats(employees: Employee[], from: Date = new Date()) {
  const monthTotal = employees
    .filter((e) => isPayInCurrentMonth(e.pay_day, from))
    .reduce((sum, e) => sum + e.salary, 0)

  const weekCount = employees.filter((e) => isPayThisWeek(e.pay_day, from)).length

  return {
    count: employees.length,
    monthTotal,
    weekCount,
  }
}
