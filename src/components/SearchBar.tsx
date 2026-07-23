type Props = {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-zinc-100 px-3.5 py-3 focus-within:border-zinc-300 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(24,24,27,0.06)]">
      <svg
        className="h-4 w-4 shrink-0 text-zinc-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3-3" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Поиск сотрудников"
        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400"
        enterKeyHint="search"
      />
    </label>
  )
}
