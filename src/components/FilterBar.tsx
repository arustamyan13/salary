import type { FilterOption, SortOption } from '../types/employee'

type Props = {
  filter: FilterOption
  sort: SortOption
  onFilterChange: (v: FilterOption) => void
  onSortChange: (v: SortOption) => void
}

const filters: { id: FilterOption; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'official', label: 'Официальные' },
  { id: 'unofficial', label: 'Неофициальные' },
]

export function FilterBar({ filter, sort, onFilterChange, onSortChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onFilterChange(item.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-95 ${
              filter === item.id
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="sr-only">Сортировка</span>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="ios-input appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 24 24%27 stroke=%27%2371717a%27%3E%3Cpath stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27M19 9l-7 7-7-7%27/%3E%3C/svg%3E')] bg-[length:1rem] bg-[right_0.9rem_center] bg-no-repeat pr-10"
        >
          <option value="pay_day">Ближайшая выплата</option>
          <option value="name">По имени</option>
          <option value="salary">По размеру зарплаты</option>
        </select>
      </label>
    </div>
  )
}
