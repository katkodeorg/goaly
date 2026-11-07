import { cn } from '@/lib/utils'
import { WORKOUT_COLOR } from '@/lib/workouts'

interface Props {
  value: number | null
  max: number
  /** Last session's reps for this set, shown as a faint marker. */
  hint?: number | null
  onChange: (value: number | null) => void
  label: string
}

/** A row of numbered tap targets (wrapped into rows on phones). Tap a number to log that many reps; tap it again to clear. */
export function RepPicker({ value, max, hint, onChange, label }: Props) {
  const numbers = Array.from({ length: max }, (_, i) => i + 1)
  return (
    <div
      role="radiogroup"
      aria-label={label}
      // Phones wrap into rows of 8 (or 10 for long ranges) so each target stays big enough to tap.
      className="grid flex-1 grid-cols-[repeat(var(--cols-m),minmax(0,1fr))] gap-1 sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))] sm:gap-[3px]"
      style={{ '--cols': max, '--cols-m': max > 16 ? 10 : 8 } as React.CSSProperties}
    >
      {numbers.map((n) => {
        const filled = value !== null && n <= value
        const selected = value === n
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${n} reps`}
            onClick={() => onChange(selected ? null : n)}
            className={cn(
              'relative flex h-9 min-w-0 items-center justify-center rounded-[5px] border font-mono text-xs tabular-nums sm:h-8 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:text-[11px]',
              filled ? 'border-transparent text-white' : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted',
              selected && 'font-semibold',
            )}
            style={filled ? { backgroundColor: WORKOUT_COLOR, opacity: selected ? 1 : 0.55 } : undefined}
          >
            {n}
            {!filled && hint === n && (
              <span className="absolute inset-x-1 bottom-0.5 h-0.5 rounded-full bg-foreground/30" aria-hidden />
            )}
          </button>
        )
      })}
    </div>
  )
}
