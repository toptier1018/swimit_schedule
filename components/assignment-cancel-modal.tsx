"use client"

import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface AssignmentCancelModalProps {
  open: boolean
  classLabel: string
  onOpenChange: (open: boolean) => void
  onSubmit: (reason: string) => void
}

export function AssignmentCancelModal({
  open,
  classLabel,
  onOpenChange,
  onSubmit,
}: AssignmentCancelModalProps) {
  const [reason, setReason] = useState("")

  const handleSubmit = () => {
    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      alert("배정 취소 사유를 입력해주세요.")
      return
    }

    console.info("[AssignmentCancel] 배정 취소 사유를 제출합니다.", {
      classLabel,
      reason: trimmedReason,
    })
    onSubmit(trimmedReason)
    setReason("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-auto w-[calc(100%-2rem)] max-w-md sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            배정 취소 사유
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            {classLabel} 배정을 취소하는 이유를 적어주세요.
          </p>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="예: 개인 사정으로 참석이 어렵습니다."
            className="min-h-28"
          />
          <div className="grid grid-cols-1 gap-3">
            <Button variant="outline" size="lg" className="h-12 text-base" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
            <Button variant="destructive" size="lg" className="h-12 text-base" onClick={handleSubmit}>
              배정 취소
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
