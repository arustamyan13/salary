import { computeStats, formatSalary } from '../lib/dates'
import type { Employee } from '../types/employee'

type Props = {
  employees: Employee[]
}

export function StatsHeader({ employees }: Props) {
  const stats = computeStats(employees)

  return (
    <div className="grid grid-cols-3 gap-2">
      <StatCard label="Сотрудники" value={String(stats.count)} />
      <StatCard label="В этом месяце" value={formatSalary(stats.monthTotal)} compact />
      <StatCard label="На этой неделе" value={String(stats.weekCount)} />
    </div>
  )
}

function StatCard({
  label,
  value,
  compact,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div className="rounded-2xl bg-zinc-50 px-3 py-3">
      <p className="text-[11px] font-medium text-zinc-500">{label}</p>
      <p
        className={`mt-1 font-bold tracking-tight text-zinc-900 ${
          compact ? 'text-[13px] leading-tight' : 'text-lg'
        }`}
      >
        {value}
      </p>
    </div>
  )
}
