import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { fmt } from '@/lib/workouts'

interface Props {
  label: string
  unit: string
  value: number
  min?: number
  max: number
  step: number
  /** Step used by the − / + buttons, for finer control than dragging. */
  nudge: number
  dp?: number
  onChange: (value: number) => void
  badge?: React.ReactNode
}

export function SliderField({ label, unit, value, min = 0, max, step, nudge, dp = 1, onChange, badge }: Props) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100))
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="flex items-center gap-2">
          {badge}
          <span className="font-mono text-sm font-semibold tabular-nums">
            {fmt(value, dp)} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
          </span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={`Decrease ${label.toLowerCase()} by ${nudge}`}
          onClick={() => onChange(clamp(value - nudge))}
        >
          <Minus />
        </Button>
        <Slider
          aria-label={label}
          value={[Math.min(value, max)]}
          min={min}
          max={max}
          step={step}
          onValueChange={([v]) => onChange(clamp(v))}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={`Increase ${label.toLowerCase()} by ${nudge}`}
          onClick={() => onChange(clamp(value + nudge))}
        >
          <Plus />
        </Button>
      </div>
    </div>
  )
}
