import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmployeeCard } from '../components/EmployeeCard'
import { EmployeeModal } from '../components/EmployeeModal'
import { FabButton } from '../components/FabButton'
import { FilterBar } from '../components/FilterBar'
import { PushSettings } from '../components/PushSettings'
import { SearchBar } from '../components/SearchBar'
import { StatsHeader } from '../components/StatsHeader'
import { useAuth } from '../context/AuthContext'
import { useEmployees } from '../context/EmployeesContext'

export function HomePage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const {
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
    createEmployee,
  } = useEmployees()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-white px-4 pb-28 pt-[calc(1rem+env(safe-area-inset-top))]">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-zinc-500">Учёт выплат</p>
          <h1 className="text-[28px] font-bold tracking-tight text-zinc-900">Зарплата</h1>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded-full bg-zinc-100 px-3 py-2 text-[13px] font-semibold text-zinc-600 transition active:scale-95"
        >
          Выйти
        </button>
      </header>

      <div className="space-y-4">
        <StatsHeader employees={employees} />
        <PushSettings />
        <SearchBar value={search} onChange={setSearch} />
        <FilterBar
          filter={filter}
          sort={sort}
          onFilterChange={setFilter}
          onSortChange={setSort}
        />
      </div>

      <section className="mt-5 space-y-3">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
          </div>
        )}

        {!loading && error && (
          <p className="rounded-3xl bg-red-50 px-4 py-3 text-[14px] text-red-600">{error}</p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-3xl bg-zinc-50 px-6 py-14 text-center">
            <p className="text-[17px] font-semibold text-zinc-900">Пока нет сотрудников</p>
            <p className="mt-2 text-[14px] text-zinc-500">
              Нажмите «+», чтобы добавить первую запись
            </p>
          </div>
        )}

        {!loading &&
          filtered.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onClick={() => navigate(`/employee/${employee.id}`)}
            />
          ))}
      </section>

      <FabButton onClick={() => setModalOpen(true)} />

      <EmployeeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={createEmployee}
      />
    </div>
  )
}
