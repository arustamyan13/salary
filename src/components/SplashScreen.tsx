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
        <p className="font-splash-classic text-[42px] leading-none tracking-tight text-black sm:text-[48px]">
          Aik prod
        </p>
        <p className="font-splash-script mt-5 text-[28px] leading-none text-emerald-600 sm:text-[32px]">
          Salary
        </p>
      </div>
    </div>
  )
}
