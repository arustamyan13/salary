import { useEffect, useId, useState, type FormEvent } from 'react'
import type { EmployeeInsert } from '../types/employee'

type Props = {
  open: boolean
  onClose: () => void
  onSubmit: (data: EmployeeInsert) => Promise<{ error: string | null }>
  initial?: EmployeeInsert
  title?: string
  submitLabel?: string
}

const emptyForm: EmployeeInsert = {
  name: '',
  salary: 0,
  pay_day: new Date().toISOString().slice(0, 10),
  official: true,
  comment: '',
}

export function EmployeeModal({
  open,
  onClose,
  onSubmit,
  initial,
  title = 'Новый сотрудник',
  submitLabel = 'Сохранить',
}: Props) {
  const titleId = useId()
  const [form, setForm] = useState<EmployeeInsert>(initial ?? emptyForm)
  const [salaryInput, setSalaryInput] = useState(String(initial?.salary || ''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const next = initial ?? emptyForm
    setForm(next)
    setSalaryInput(next.salary ? String(next.salary) : '')
    setError(null)
  }, [open, initial])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const salary = Number(salaryInput.replace(/\s/g, '').replace(',', '.'))
    if (!form.name.trim()) {
      setError('Укажите имя')
      return
    }
    if (!Number.isFinite(salary) || salary <= 0) {
      setError('Укажите корректную зарплату')
      return
    }
    if (!form.pay_day) {
      setError('Укажите дату выплаты')
      return
    }

    setSaving(true)
    setError(null)
    const result = await onSubmit({
      ...form,
      name: form.name.trim(),
      salary,
      comment: form.comment?.trim() || null,
    })
    setSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md animate-slide-up rounded-t-[28px] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[28px] sm:p-6"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-200 sm:hidden" />
        <div className="mb-5 flex items-center justify-between">
          <h2 id={titleId} className="text-xl font-bold tracking-tight text-zinc-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition active:scale-95"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-zinc-500">Имя</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="ios-input"
              placeholder="Иван Иванов"
              autoFocus
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-zinc-500">
              Размер зарплаты
            </span>
            <input
              required
              inputMode="decimal"
              value={salaryInput}
              onChange={(e) => setSalaryInput(e.target.value)}
              className="ios-input"
              placeholder="50000"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-zinc-500">Дата выплаты</span>
            <input
              required
              type="date"
              value={form.pay_day}
              onChange={(e) => setForm((f) => ({ ...f, pay_day: e.target.value }))}
              className="ios-input"
            />
          </label>

          <div className="rounded-2xl bg-zinc-50 p-1">
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, official: true }))}
                className={`rounded-xl py-3 text-[15px] font-semibold transition ${
                  form.official
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-zinc-500'
                }`}
              >
                Официально
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, official: false }))}
                className={`rounded-xl py-3 text-[15px] font-semibold transition ${
                  !form.official
                    ? 'bg-white text-orange-700 shadow-sm'
                    : 'text-zinc-500'
                }`}
              >
                Неофициально
              </button>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-zinc-500">
              Комментарий <span className="text-zinc-400">(необязательно)</span>
            </span>
            <textarea
              value={form.comment ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
              className="ios-input min-h-[88px] resize-none"
              placeholder="Заметки…"
            />
          </label>

          {error && (
            <p className="rounded-2xl bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="ios-button-primary w-full disabled:opacity-60"
          >
            {saving ? 'Сохранение…' : submitLabel}
          </button>
        </form>
      </div>
    </div>
  )
}
