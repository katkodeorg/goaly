import { useEffect, useState } from 'react'
import { toKey } from '@/lib/dates'

/** Today's date, re-evaluated when the calendar day rolls over or the tab regains focus. */
export function useToday(): Date {
  const [today, setToday] = useState(() => new Date())

  useEffect(() => {
    const check = () => {
      const now = new Date()
      setToday((prev) => (toKey(prev) === toKey(now) ? prev : now))
    }
    const id = setInterval(check, 30_000)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  return today
}
