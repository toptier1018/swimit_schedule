"use client"

import { useState } from "react"
import { Schedule, ScheduleClass } from "@/types/schedule"
import { Calendar, MapPin, Clock, User, Building2, Check, X, ClipboardCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AssignmentCancelModal } from "./assignment-cancel-modal"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DateSchedulesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  schedules: Schedule[]
  onConfirm: (id: string) => void
  onClassCheck: (scheduleId: string, classId: string, isChecked: boolean) => void
  onClassCancel: (scheduleId: string, classId: string, reason: string) => void
  isDeveloperMode: boolean
}

export function DateSchedulesModal({
  open,
  onOpenChange,
  date,
  schedules,
  onConfirm,
  onClassCheck,
  onClassCancel,
  isDeveloperMode,
}: DateSchedulesModalProps) {
  const [cancelTarget, setCancelTarget] = useState<{
    scheduleId: string
    classItem: ScheduleClass
  } | null>(null)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const month = d.getMonth() + 1
    const day = d.getDate()
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"]
    const weekday = weekdays[d.getDay()]
    return `${month}월 ${day}일 (${weekday})`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Calendar className="h-5 w-5" />
            {formatDate(date)} 일정
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="rounded-lg border border-border bg-card p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-foreground">{schedule.className}</h4>
                  <p className="text-sm text-primary flex items-center gap-1 mt-1">
                    <Clock className="h-3.5 w-3.5" />
                    {schedule.time}
                  </p>
                </div>
                <Badge 
                  variant={schedule.isConfirmed ? "default" : "secondary"}
                  className={schedule.isConfirmed 
                    ? "bg-accent text-accent-foreground" 
                    : "bg-secondary text-secondary-foreground"
                  }
                >
                  {schedule.isConfirmed ? "확정" : "대기중"}
                </Badge>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>{schedule.venue}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="text-xs">{schedule.address || schedule.region}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 shrink-0" />
                  <span className="font-medium text-foreground">{schedule.coachName || "대표 코치 미배정"}</span>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  클래스 시간표
                </div>
                <div className="space-y-2">
                  {schedule.classes.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-md bg-card p-3 ${
                        item.isOpen ? "" : "opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex-1 text-sm">
                          <span className="block font-medium text-foreground">
                            {item.isOpen ? `${item.lane} · ${item.name}` : item.lane}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            담당 선생님: {item.coachName || "미배정"}
                          </span>
                          {item.cancellationReason && (
                            <span className="mt-1 block text-xs text-destructive">
                              취소 사유: {item.cancellationReason}
                            </span>
                          )}
                        </span>
                        <Badge variant={item.isCoachChecked ? "default" : "secondary"} className="shrink-0 whitespace-nowrap">
                          {!item.isOpen ? "운영 없음" : item.isCoachChecked ? "배정 완료" : "확인 전"}
                        </Badge>
                      </div>

                      {!isDeveloperMode && item.isOpen && (
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {item.isCoachChecked ? (
                            <Button size="sm" className="bg-accent hover:bg-accent/90" disabled>
                              배정 완료
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => onClassCheck(schedule.id, item.id, true)}
                              disabled={!item.coachName}
                            >
                              {item.coachName ? "배정 확인" : "미배정"}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCancelTarget({ scheduleId: schedule.id, classItem: item })}
                            disabled={!item.coachName}
                            className="text-destructive hover:text-destructive"
                          >
                            배정 취소
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {isDeveloperMode && !schedule.isConfirmed && (
                <Button
                  size="sm"
                  onClick={() => onConfirm(schedule.id)}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mt-2"
                >
                  <Check className="h-4 w-4 mr-1" />
                  일정 확정하기
                </Button>
              )}
            </div>
          ))}
        </div>

        <AssignmentCancelModal
          open={!!cancelTarget}
          classLabel={cancelTarget?.classItem.lane || ""}
          onOpenChange={(open) => {
            if (!open) setCancelTarget(null)
          }}
          onSubmit={(reason) => {
            if (!cancelTarget) return
            onClassCancel(cancelTarget.scheduleId, cancelTarget.classItem.id, reason)
            setCancelTarget(null)
          }}
        />

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" />
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
