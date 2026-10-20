import { useRef, useState } from 'react'
import { Download, HardDriveDownload, Upload } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { StoreApi } from '@/hooks/useStore'
import { toKey } from '@/lib/dates'
import { downloadBackup, parseBackup } from '@/lib/storage'
import type { Store } from '@/lib/types'

interface Props {
  api: StoreApi
  today: Date
  onNotice: (message: string, tone?: 'ok' | 'error') => void
}

export function BackupMenu({ api, today, onNotice }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Store | null>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const parsed = parseBackup(await file.text())
      setPending(parsed)
    } catch (err) {
      onNotice(err instanceof Error ? err.message : 'Could not read that backup', 'error')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const apply = (mode: 'merge' | 'replace') => {
    if (!pending) return
    if (mode === 'merge') api.merge(pending)
    else api.replace(pending)
    onNotice(
      mode === 'merge'
        ? `Merged ${pending.goals.length} goals and ${pending.entries.length} logs`
        : `Restored ${pending.goals.length} goals and ${pending.entries.length} logs`,
    )
    setPending(null)
  }

  const count = api.store.entries.length

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Backup and restore">
            <HardDriveDownload />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Stored in this browser · {count} {count === 1 ? 'log' : 'logs'}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              downloadBackup(api.store, toKey(today))
              onNotice('Backup downloaded')
            }}
          >
            <Download /> Export backup (.json)
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
            <Upload /> Restore from backup…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore backup</AlertDialogTitle>
            <AlertDialogDescription>
              The file contains {pending?.goals.length ?? 0} goals and {pending?.entries.length ?? 0} logs. Merge keeps
              what you have here and adds the backup on top. Replace discards everything in this browser first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => apply('merge')}>
              Merge
            </Button>
            <AlertDialogAction onClick={() => apply('replace')}>Replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
