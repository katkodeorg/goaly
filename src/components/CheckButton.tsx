import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  checked: boolean
  color: string
  onChange: (checked: boolean) => void
  muted?: boolean
  label: string
}

export function CheckButton({ checked, color, onChange, muted, label }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex size-8 items-center justify-center sm:size-7 rounded-md border transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        checked ? 'border-transparent text-white' : 'border-border bg-background hover:bg-muted',
      )}
      style={checked ? { backgroundColor: color, opacity: muted ? 0.55 : 1 } : undefined}
    >
      <Check className={cn('size-4 transition-transform', checked ? 'scale-100' : 'scale-0')} strokeWidth={3} />
    </button>
  )
}
