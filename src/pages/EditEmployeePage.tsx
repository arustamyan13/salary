import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EmployeeModal } from '../components/EmployeeModal'
import { useEmployees } from '../context/EmployeesContext'
import { supabase } from '../lib/supabase'
import {
  daysUntilPay,
  formatDaysLeft,
  formatPayDate,
  formatSalary,
} from '../lib/dates'
import type { Employee, EmployeeInsert } from '../types/employee'

export function EditEmployeePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getById, updateEmployee, deleteEmployee, markPaid, loading } = useEmployees()
  const fromList = id ? getById(id) : undefined
  const [fetched, setFetched] = useState<Employee | null>(null)
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const employee = fromList ?? fetched ?? undefined

  useEffect(() => {
    if (!id || fromList) {
      setFetched(null)
      setFetchError(null)
      return
    }

    let cancelled = false
    setFetching(true)
    setFetchError(null)

    void supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        setFetching(false)
        if (error) {
          setFetchError(error.message)
          setFetched(null)
          return
        }
        if (!data) {
          setFetched(null)
          return
        }
        setFetched({ ...(data as Employee), salary: Number((data as Employee).salary) })
      })

    return () => {
      cancelled = true
    }
  }, [id, fromList])

  const initial = useMemo<EmployeeInsert | undefined>(() => {
    if (!employee) return undefined
    return {
      name: employee.name,
      salary: employee.salary,
      pay_day: employee.pay_day,
      official: employee.official,
      comment: employee.comment,
    }
  }, [employee])

  const showSpinner = !employee && (loading || fetching)

  if (showSpinner) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 bg-white px-4">
        <p className="text-[17px] font-semibold text-zinc-900">Сотрудник не найден</p>
        {fetchError && <p className="text-center text-[13px] text-red-600">{fetchError}</p>}
        <Link to="/" className="ios-button-primary">
          На главную
        </Link>
      </div>
    )
  }

  const days = daysUntilPay(employee.pay_day)

  async function handlePaid() {
    if (!employee) return
    setBusy(true)
    setMessage(null)
    const result = await markPaid(employee.id)
    setBusy(false)
    if (result.error) {
      setMessage(result.error)
      return
    }
    setMessage('Дата выплаты перенесена на следующий месяц')
  }

  async function handleDelete() {
    if (!employee) return
    const confirmed = window.confirm(`Удалить сотрудника «${employee.name}»?`)
    if (!confirmed) return
    setBusy(true)
    const result = await deleteEmployee(employee.id)
    setBusy(false)
    if (result.error) {
      setMessage(result.error)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-white px-4 pb-10 pt-[calc(1rem+env(safe-area-inset-top))]">
      <header className="mb-6 flex items-center gap-3">
        <Link
          to="/"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 transition active:scale-95"
          aria-label="Назад"
        >
          ←
        </Link>
        <h1 className="text-[22px] font-bold tracking-tight text-zinc-900">Сотрудник</h1>
      </header>

      <div className="rounded-[28px] border border-zinc-100 bg-zinc-50 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[24px] font-bold tracking-tight text-zinc-900">
              {employee.name}
            </h2>
            <p className="mt-1 text-[28px] font-bold text-zinc-900">
              {formatSalary(employee.salary)}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${
              employee.official
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-orange-100 text-orange-700'
            }`}
          >
            {employee.official ? 'Официально' : 'Неофициально'}
          </span>
        </div>

        <div className="mt-5 space-y-2 border-t border-zinc-200/70 pt-4">
          <Row label="Дата выплаты" value={formatPayDate(employee.pay_day)} />
          <Row label="До выплаты" value={formatDaysLeft(days)} />
          {employee.comment && <Row label="Комментарий" value={employee.comment} />}
        </div>
      </div>

      {message && (
        <p className="mt-4 rounded-2xl bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700">
          {message}
        </p>
      )}

      <div className="mt-6 space-y-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void handlePaid()}
          className="ios-button-primary w-full disabled:opacity-60"
        >
          Выплачено
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setEditOpen(true)}
          className="ios-button-secondary w-full"
        >
          Редактировать
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleDelete()}
          className="w-full rounded-2xl bg-red-50 py-3.5 text-[16px] font-semibold text-red-600 transition active:scale-[0.98] disabled:opacity-60"
        >
          Удалить
        </button>
      </div>

      <EmployeeModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={async (data) => {
          const result = await updateEmployee(employee.id, data)
          if (!result.error) setFetched(null)
          return result
        }}
        initial={initial}
        title="Редактирование"
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[13px] text-zinc-500">{label}</span>
      <span className="text-right text-[14px] font-medium text-zinc-900">{value}</span>
    </div>
  )
}
