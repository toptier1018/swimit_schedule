"use client"

import { UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatCoachName } from "@/lib/format-coach-name"

interface AssignmentConfirmModalProps {
  open: boolean
  coachName: string
  classLabel: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function AssignmentConfirmModal({
  open,
  coachName,
  classLabel,
  onOpenChange,
  onConfirm,
}: AssignmentConfirmModalProps) {
  const displayName = formatCoachName(coachName)

  const handleConfirm = () => {
    console.info("[AssignmentConfirm] 코치 본인 확인을 완료했습니다.", {
      classLabel,
      coachName: displayName,
    })
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-auto w-[calc(100%-2rem)] max-w-md gap-0 rounded-2xl p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-lg text-primary">
            <UserCheck className="h-5 w-5" />
            배정 확인
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 px-5 py-6">
          <p className="text-center text-sm text-muted-foreground">{classLabel}</p>

          <div className="rounded-2xl bg-primary/10 px-4 py-8 text-center">
            <p className="text-sm font-medium text-muted-foreground">담당 선생님</p>
            <p className="mt-2 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
              {displayName}
            </p>
          </div>

          <p className="text-center text-base leading-relaxed text-foreground">
            위 코치님이 맞으신가요?
            <br />
            <span className="text-sm text-muted-foreground">맞다면 아래 버튼을 눌러 배정을 완료해 주세요.</span>
          </p>

          <div className="grid grid-cols-1 gap-3">
            <Button
              size="lg"
              className="h-12 text-base"
              onClick={handleConfirm}
            >
              네, 맞습니다
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 text-base"
              onClick={() => onOpenChange(false)}
            >
              아니요
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
