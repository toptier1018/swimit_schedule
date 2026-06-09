"use client"

import { useState } from "react"
import { ScheduleClass } from "@/types/schedule"
import { formatCoachName } from "@/lib/format-coach-name"
import { formatStudentSupplies } from "@/lib/student-supplies"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AssignmentCancelModal } from "./assignment-cancel-modal"
import { AssignmentConfirmModal } from "./assignment-confirm-modal"

interface ClassAssignmentRowProps {
  scheduleId: string
  item: ScheduleClass
  isDeveloperMode: boolean
  onEditTeacher?: (item: ScheduleClass) => void
  onClassCheck: (
    scheduleId: string,
    classId: string,
    isChecked: boolean,
    studentSupplies?: string[]
  ) => void
  onClassCancel: (scheduleId: string, classId: string, reason: string) => void
}

export function ClassAssignmentRow({
  scheduleId,
  item,
  isDeveloperMode,
  onEditTeacher,
  onClassCheck,
  onClassCancel,
}: ClassAssignmentRowProps) {
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const classLabel = item.isOpen ? `${item.lane} · ${item.name}` : item.lane

  return (
    <>
      <div
        className={`rounded-xl border border-border bg-card p-4 ${
          item.isOpen ? "" : "opacity-60"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{classLabel}</p>

            {isDeveloperMode && item.isOpen && onEditTeacher ? (
              <button
                type="button"
                onClick={() => onEditTeacher(item)}
                className="mt-3 block w-full text-left"
              >
                <p className="text-xs text-primary">탭하여 담당 선생님 변경</p>
                <p className="mt-1 text-3xl font-bold leading-tight text-foreground">
                  {formatCoachName(item.coachName)}
                </p>
              </button>
            ) : (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">담당 선생님</p>
                <p className="mt-1 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                  {formatCoachName(item.coachName)}
                </p>
              </div>
            )}

            {item.isCoachChecked && item.studentSupplies && item.studentSupplies.length > 0 && (
              <p className="mt-2 text-sm text-primary">
                수강생 준비물: {formatStudentSupplies(item.studentSupplies)}
              </p>
            )}

            {item.cancellationReason && (
              <p className="mt-2 text-sm text-destructive">취소 사유: {item.cancellationReason}</p>
            )}
          </div>

          <Badge
            variant={item.isCoachChecked ? "default" : "secondary"}
            className="shrink-0 px-2.5 py-1 text-xs whitespace-nowrap"
          >
            {!item.isOpen ? "운영 없음" : item.isCoachChecked ? "배정 완료" : "확인 전"}
          </Badge>
        </div>

        {!isDeveloperMode && item.isOpen && (
          <div className="mt-4 grid grid-cols-1 gap-2">
            {item.isCoachChecked ? (
              <Button
                size="lg"
                className="h-12 w-full bg-accent text-base hover:bg-accent/90"
                onClick={() => onClassCheck(scheduleId, item.id, false)}
              >
                배정 완료
              </Button>
            ) : (
              <Button
                size="lg"
                className="h-12 w-full text-base"
                onClick={() => setIsConfirmOpen(true)}
                disabled={!item.coachName}
              >
                {item.coachName ? "배정 확인" : "미배정"}
              </Button>
            )}
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full text-base text-destructive hover:text-destructive"
              onClick={() => setIsCancelOpen(true)}
              disabled={!item.coachName}
            >
              배정 취소
            </Button>
          </div>
        )}
      </div>

      <AssignmentConfirmModal
        open={isConfirmOpen}
        coachName={item.coachName}
        classLabel={classLabel}
        initialSupplies={item.studentSupplies}
        onOpenChange={setIsConfirmOpen}
        onConfirm={(studentSupplies) => onClassCheck(scheduleId, item.id, true, studentSupplies)}
      />

      <AssignmentCancelModal
        open={isCancelOpen}
        classLabel={item.lane}
        onOpenChange={setIsCancelOpen}
        onSubmit={(reason) => {
          onClassCancel(scheduleId, item.id, reason)
          setIsCancelOpen(false)
        }}
      />
    </>
  )
}
