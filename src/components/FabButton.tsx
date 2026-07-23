type Props = {
  onClick: () => void
}

export function FabButton({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Добавить сотрудника"
      className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-3xl leading-none text-white shadow-lg shadow-zinc-900/25 transition duration-300 hover:scale-105 active:scale-95"
    >
      <span className="-mt-0.5">+</span>
    </button>
  )
}
