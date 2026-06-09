"use client"

import { useEffect, useState } from "react"
import { UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatCoachName } from "@/lib/format-coach-name"
import { STUDENT_SUPPLY_OPTIONS } from "@/lib/student-supplies"

interface AssignmentConfirmModalProps {
  open: boolean
  coachName: string
  classLabel: string
  initialSupplies?: string[]
  onOpenChange: (open: boolean) => void
  onConfirm: (studentSupplies: string[]) => void
}

export function AssignmentConfirmModal({
  open,
  coachName,
  classLabel,
  initialSupplies = [],
  onOpenChange,
  onConfirm,
}: AssignmentConfirmModalProps) {
  const [selectedSupplies, setSelectedSupplies] = useState<string[]>(initialSupplies)
  const displayName = formatCoachName(coachName)

  useEffect(() => {
    if (open) {
      setSelectedSupplies(initialSupplies)
    }
  }, [open, initialSupplies])

  const toggleSupply = (supply: string, checked: boolean) => {
    setSelectedSupplies((prev) =>
      checked ? [...prev, supply] : prev.filter((item) => item !== supply)
    )
  }

  const handleConfirm = () => {
    console.info("[AssignmentConfirm] 코치 본인 확인 및 수강생 준비물을 저장합니다.", {
      classLabel,
      coachName: displayName,
      studentSupplies: selectedSupplies,
    })
    onConfirm(selectedSupplies)
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
          </p>

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground">수강생 준비물 (선택)</p>
            <p className="mt-1 text-xs text-muted-foreground">
              필요한 준비물만 체크해 주세요. 없으면 비워두셔도 됩니다.
            </p>
            <div className="mt-4 space-y-3">
              {STUDENT_SUPPLY_OPTIONS.map((supply, index) => {
                const checked = selectedSupplies.includes(supply)
                return (
                  <label
                    key={supply}
                    htmlFor={`supply-${supply}`}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <Checkbox
                      id={`supply-${supply}`}
                      checked={checked}
                      onCheckedChange={(value) => toggleSupply(supply, value === true)}
                    />
                    <span className="text-base text-foreground">
                      {index + 1}. {supply}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Button size="lg" className="h-12 text-base" onClick={handleConfirm}>
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
