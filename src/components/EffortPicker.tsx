import { cn } from '@/lib/utils'

interface Props {
  value: number | null
  color: string
  onChange: (value: number | null) => void
  /** Dim the control when the shown value came from an earlier day in the period. */
  muted?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function EffortPicker({ value, color, onChange, muted, size = 'md' }: Props) {
  const levels = Array.from({ length: 10 }, (_, i) => i + 1)
  return (
    <div className="flex items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Effort level"
        className={cn('flex items-center', size === 'sm' ? 'gap-[2px]' : size === 'lg' ? 'gap-1' : 'gap-[3px]')}
      >
        {levels.map((n) => {
          const active = value !== null && n <= value
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`Effort ${n}`}
              title={`Effort ${n}`}
              onClick={() => onChange(value === n ? null : n)}
              className={cn(
                'rounded-[3px] border transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                size === 'sm' ? 'h-4 w-[9px]' : size === 'lg' ? 'h-8 w-6' : 'h-6 w-3',
                active ? 'border-transparent' : 'border-border bg-muted/40 hover:bg-muted',
              )}
              style={
                active
                  ? {
                      backgroundColor: color,
                      opacity: (muted ? 0.45 : 1) * (0.35 + 0.65 * (n / 10)),
                    }
                  : undefined
              }
            />
          )
        })}
      </div>
      <span
        className={cn(
          'w-8 text-right font-mono text-xs tabular-nums',
          value === null ? 'text-muted-foreground/60' : muted ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {value === null ? '–' : `${value}/10`}
      </span>
    </div>
  )
}
