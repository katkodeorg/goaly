import { format } from 'date-fns'
import { Archive, ArchiveRestore, Flame, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { StoreApi } from '@/hooks/useStore'
import { fromKey, periodKeys, toKey } from '@/lib/dates'
import { periodValue, streak } from '@/lib/stats'
import { COLORS, type Goal } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CheckButton } from './CheckButton'
import { EffortPicker } from './EffortPicker'

interface Props {
  goal: Goal
  /** The day being logged (today on the home screen, any day in the calendar). */
  date: Date
  today: Date
  api: StoreApi
  onEdit?: (goal: Goal) => void
  onDelete?: (goal: Goal) => void
  compact?: boolean
}

export function GoalRow({ goal, date, today, api, onEdit, onDelete, compact }: Props) {
  const color = COLORS[goal.color]
  const dateKey = toKey(date)
  const shown = periodValue(goal, date, api.entryMap)
  const fromOtherDay = shown !== undefined && shown.date !== dateKey
  const currentStreak = streak(goal, today, api.entryMap)

  const handleCheck = (checked: boolean) => {
    if (checked) api.setEntry(goal.id, dateKey, 1)
    else if (fromOtherDay) api.clearEntries(goal.id, periodKeys(goal.cadence, date))
    else api.setEntry(goal.id, dateKey, null)
  }

  const handleEffort = (value: number | null) => {
    api.setEntry(goal.id, dateKey, value)
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50',
        compact ? 'py-1.5' : 'min-h-12',
      )}
    >
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className={cn('font-medium', compact ? 'line-clamp-2 text-sm leading-snug' : 'truncate text-[15px]', goal.archived && 'text-muted-foreground line-through')}>
          {goal.title}
        </div>
        {!compact && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {currentStreak > 1 && (
              <span className="inline-flex items-center gap-1">
                <Flame className="size-3" /> {currentStreak} {goal.cadence === 'daily' ? 'days' : goal.cadence === 'weekly' ? 'weeks' : 'months'}
              </span>
            )}
            {fromOtherDay && shown && (
              <span>
                logged {format(fromKey(shown.date), 'EEE d')}
                {goal.kind === 'effort' ? ` · ${shown.value}/10` : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {goal.kind === 'check' ? (
        <CheckButton
          checked={shown !== undefined}
          color={color}
          muted={fromOtherDay}
          onChange={handleCheck}
          label={`Mark "${goal.title}" done`}
        />
      ) : (
        <EffortPicker
          value={shown ? shown.value : null}
          color={color}
          muted={fromOtherDay}
          onChange={handleEffort}
          size={compact ? 'sm' : 'md'}
        />
      )}

      {onEdit && onDelete && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Goal options" className="text-muted-foreground">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(goal)}>
              <Pencil /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => api.updateGoal(goal.id, { archived: !goal.archived })}>
              {goal.archived ? (
                <>
                  <ArchiveRestore /> Unarchive
                </>
              ) : (
                <>
                  <Archive /> Archive
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(goal)}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
