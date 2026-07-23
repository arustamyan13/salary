import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabase'
import { advancePayDay, daysUntilPay } from '../lib/dates'
import { OWNER_ID } from '../lib/auth'
import type {
  Employee,
  EmployeeInsert,
  EmployeeUpdate,
  FilterOption,
  SortOption,
} from '../types/employee'
import { useAuth } from './AuthContext'

type EmployeesContextValue = {
  employees: Employee[]
  filtered: Employee[]
  loading: boolean
  error: string | null
  search: string
  sort: SortOption
  filter: FilterOption
  setSearch: (v: string) => void
  setSort: (v: SortOption) => void
  setFilter: (v: FilterOption) => void
  refresh: () => Promise<void>
  createEmployee: (data: EmployeeInsert) => Promise<{ error: string | null }>
  updateEmployee: (id: string, data: EmployeeUpdate) => Promise<{ error: string | null }>
  deleteEmployee: (id: string) => Promise<{ error: string | null }>
  markPaid: (id: string) => Promise<{ error: string | null }>
  getById: (id: string) => Employee | undefined
}

const EmployeesContext = createContext<EmployeesContextValue | null>(null)

function applySort(list: Employee[], sort: SortOption): Employee[] {
  const copy = [...list]
  switch (sort) {
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    case 'salary':
      return copy.sort((a, b) => b.salary - a.salary)
    case 'pay_day':
    default:
      return copy.sort((a, b) => daysUntilPay(a.pay_day) - daysUntilPay(b.pay_day))
  }
}

function mapRows(data: Employee[] | null): Employee[] {
  return (data ?? []).map((row) => ({
    ...row,
    salary: Number(row.salary),
  }))
}

export function EmployeesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('pay_day')
  const [filter, setFilter] = useState<FilterOption>('all')

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!user) {
      setEmployees([])
      setLoading(false)
      return
    }

    // Don't flash full-page spinner on background refreshes (edit/save/pay)
    if (!opts?.silent) setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('employees')
      .select('*')
      .order('pay_day', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      if (!opts?.silent) setEmployees([])
    } else {
      setEmployees(mapRows(data as Employee[]))
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createEmployee = useCallback(
    async (data: EmployeeInsert) => {
      if (!user) return { error: 'Необходима авторизация' }

      const { error: insertError } = await supabase.from('employees').insert({
        ...data,
        user_id: OWNER_ID,
        comment: data.comment ?? null,
      })

      if (insertError) return { error: insertError.message }
      await refresh({ silent: true })
      return { error: null }
    },
    [user, refresh],
  )

  const updateEmployee = useCallback(
    async (id: string, data: EmployeeUpdate) => {
      const { data: updated, error: updateError } = await supabase
        .from('employees')
        .update(data)
        .eq('id', id)
        .select('*')
        .maybeSingle()

      if (updateError) return { error: updateError.message }

      if (updated) {
        const row = mapRows([updated as Employee])[0]
        setEmployees((prev) => prev.map((e) => (e.id === id ? row : e)))
      } else {
        // Fallback: merge locally if select is restricted
        setEmployees((prev) =>
          prev.map((e) =>
            e.id === id
              ? {
                  ...e,
                  ...data,
                  salary: data.salary !== undefined ? Number(data.salary) : e.salary,
                  comment: data.comment !== undefined ? data.comment ?? null : e.comment,
                }
              : e,
          ),
        )
        await refresh({ silent: true })
      }

      return { error: null }
    },
    [refresh],
  )

  const deleteEmployee = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from('employees').delete().eq('id', id)
      if (deleteError) return { error: deleteError.message }
      setEmployees((prev) => prev.filter((e) => e.id !== id))
      return { error: null }
    },
    [],
  )

  const markPaid = useCallback(
    async (id: string) => {
      const employee = employees.find((e) => e.id === id)
      if (!employee) return { error: 'Сотрудник не найден' }

      const nextPayDay = advancePayDay(employee.pay_day)
      return updateEmployee(id, { pay_day: nextPayDay })
    },
    [employees, updateEmployee],
  )

  const getById = useCallback((id: string) => employees.find((e) => e.id === id), [employees])

  const filtered = useMemo(() => {
    let list = employees

    if (filter === 'official') list = list.filter((e) => e.official)
    if (filter === 'unofficial') list = list.filter((e) => !e.official)

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.comment?.toLowerCase().includes(q) ?? false),
      )
    }

    return applySort(list, sort)
  }, [employees, filter, search, sort])

  const value = useMemo(
    () => ({
      employees,
      filtered,
      loading,
      error,
      search,
      sort,
      filter,
      setSearch,
      setSort,
      setFilter,
      refresh: () => refresh({ silent: true }),
      createEmployee,
      updateEmployee,
      deleteEmployee,
      markPaid,
      getById,
    }),
    [
      employees,
      filtered,
      loading,
      error,
      search,
      sort,
      filter,
      refresh,
      createEmployee,
      updateEmployee,
      deleteEmployee,
      markPaid,
      getById,
    ],
  )

  return <EmployeesContext.Provider value={value}>{children}</EmployeesContext.Provider>
}

export function useEmployees() {
  const ctx = useContext(EmployeesContext)
  if (!ctx) throw new Error('useEmployees must be used within EmployeesProvider')
  return ctx
}
