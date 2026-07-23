import type { Employee } from '../types/employee'
import {
  daysUntilPay,
  formatDaysLeft,
  formatPayDate,
  formatSalary,
  getCardUrgency,
} from '../lib/dates'

const urgencyStyles = {
  ok: {
    card: 'bg-emerald-50 border-emerald-100',
    accent: 'bg-emerald-500',
    days: 'text-emerald-700',
  },
  soon: {
    card: 'bg-amber-50 border-amber-100',
    accent: 'bg-amber-400',
    days: 'text-amber-700',
  },
  urgent: {
    card: 'bg-red-50 border-red-100',
    accent: 'bg-red-500',
    days: 'text-red-700',
  },
} as const

type Props = {
  employee: Employee
  onClick: () => void
}

export function EmployeeCard({ employee, onClick }: Props) {
  const urgency = getCardUrgency(employee.pay_day)
  const styles = urgencyStyles[urgency]
  const days = daysUntilPay(employee.pay_day)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-3xl border p-4 shadow-sm transition-all duration-300 active:scale-[0.98] hover:shadow-md ${styles.card}`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${styles.accent}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[17px] font-semibold tracking-tight text-zinc-900">
              {employee.name}
            </h3>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                employee.official
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-orange-100 text-orange-700'
              }`}
            >
              {employee.official ? 'Официально' : 'Неофициально'}
            </span>
          </div>

          <p className="mt-1 text-[22px] font-bold tracking-tight text-zinc-900">
            {formatSalary(employee.salary)}
          </p>

          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-[13px] text-zinc-500">{formatPayDate(employee.pay_day)}</p>
            <p className={`text-[13px] font-semibold ${styles.days}`}>{formatDaysLeft(days)}</p>
          </div>
        </div>
      </div>
    </button>
  )
}
