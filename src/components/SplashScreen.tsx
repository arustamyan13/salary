import { useEffect, useState } from 'react'

type Props = {
  onFinished: () => void
}

export function SplashScreen({ onFinished }: Props) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const leaveTimer = window.setTimeout(() => setLeaving(true), 1600)
    const doneTimer = window.setTimeout(() => onFinished(), 2000)
    return () => {
      window.clearTimeout(leaveTimer)
      window.clearTimeout(doneTimer)
    }
  }, [onFinished])

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white transition-opacity duration-400 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
      aria-hidden={leaving}
    >
      <div className="flex flex-col items-center px-8 text-center animate-splash-in">
        <p className="text-[34px] font-semibold tracking-[-0.04em] text-zinc-900">Aik prod</p>
        <div className="mt-4 h-px w-10 bg-zinc-200" />
        <p className="mt-4 text-[12px] font-medium uppercase tracking-[0.42em] text-zinc-400">
          Salary
        </p>
      </div>
    </div>
  )
}
