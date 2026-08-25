'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'

interface HumanTakeoverDialogProps {
  open: boolean
  reason: string
  action: string
  screenshot?: string
  onResume: (result: string) => void
}

export function HumanTakeoverDialog({ open, reason, action, screenshot, onResume }: HumanTakeoverDialogProps) {
  const [status, setStatus] = useState<'waiting' | 'done'>('waiting')
  const [userNote, setUserNote] = useState('')

  const handleDone = () => {
    setStatus('done')
    onResume(userNote || 'Human completed the action successfully')
    setTimeout(() => setStatus('waiting'), 1000)
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg bg-zinc-900 border-amber-500/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            Human Intervention Required
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            The AI agent encountered an obstacle and needs your help.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {screenshot && (
            <div className="rounded-lg overflow-hidden border border-zinc-700">
              <img src={screenshot} alt="Current page" className="w-full h-auto" />
            </div>
          )}

          <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
            <p className="text-sm text-zinc-300">
              <span className="text-amber-400 font-medium">Why:</span> {reason}
            </p>
            <p className="text-sm text-zinc-300">
              <span className="text-amber-400 font-medium">What to do:</span> {action}
            </p>
          </div>

          <div>
            <textarea
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              placeholder="Optional: describe what you did..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 placeholder-zinc-500 resize-none h-20 focus:outline-none focus:border-amber-500"
            />
          </div>

          <Button
            onClick={handleDone}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-medium"
          >
            {status === 'done' ? (
              <><CheckCircle className="h-4 w-4 mr-2" /> Resuming Agent...</>
            ) : (
              <><Loader2 className="h-4 w-4 mr-2" /> I&apos;m Done, Continue Agent</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
