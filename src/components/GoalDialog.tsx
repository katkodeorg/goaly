import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GoalInput } from '@/hooks/useStore'
import { CADENCE_LABEL, COLORS, COLOR_KEYS, type Cadence, type ColorKey, type Goal, type GoalKind } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: Goal
  onSubmit: (input: GoalInput) => void
}

const DEFAULTS: GoalInput = { title: '', cadence: 'daily', kind: 'check', color: 'teal' }

export function GoalDialog({ open, onOpenChange, goal, onSubmit }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Keyed so the form state resets whenever a different goal (or a new one) is opened. */}
        <GoalForm key={goal?.id ?? 'new'} goal={goal} onSubmit={onSubmit} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function GoalForm({
  goal,
  onSubmit,
  onClose,
}: {
  goal?: Goal
  onSubmit: (input: GoalInput) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<GoalInput>(() =>
    goal ? { title: goal.title, cadence: goal.cadence, kind: goal.kind, color: goal.color } : DEFAULTS,
  )

  const valid = form.title.trim().length > 0

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    onSubmit({ ...form, title: form.title.trim() })
    onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>{goal ? 'Edit goal' : 'New goal'}</DialogTitle>
        <DialogDescription>
          {goal
            ? 'Changes apply to the goal going forward. Your history is kept.'
            : 'Give it a name, choose how often you want to work on it, and how you want to log it.'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <Label htmlFor="goal-title">Goal</Label>
        <Input
          id="goal-title"
          autoFocus
          placeholder="e.g. Go to the gym"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          maxLength={80}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cadence</Label>
          <Select value={form.cadence} onValueChange={(v) => setForm({ ...form, cadence: v as Cadence })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CADENCE_LABEL) as Cadence[]).map((c) => (
                <SelectItem key={c} value={c}>
                  {CADENCE_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Log as</Label>
          <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as GoalKind })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="check">Done / not done</SelectItem>
              <SelectItem value="effort">Effort 1–10</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Colour</Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_KEYS.map((key: ColorKey) => (
            <button
              key={key}
              type="button"
              aria-label={key}
              aria-pressed={form.color === key}
              onClick={() => setForm({ ...form, color: key })}
              className={cn(
                'size-7 rounded-full border-2 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring/60 outline-none',
                form.color === key ? 'border-foreground' : 'border-transparent',
              )}
              style={{ backgroundColor: COLORS[key] }}
            />
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!valid}>
          {goal ? 'Save changes' : 'Add goal'}
        </Button>
      </DialogFooter>
    </form>
  )
}
