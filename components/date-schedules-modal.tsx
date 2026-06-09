"use client"

import { Schedule } from "@/types/schedule"
import { Calendar, MapPin, Clock, Building2, Check, X, ClipboardCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ClassAssignmentRow } from "./class-assignment-row"
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
  onClassCheck: (
    scheduleId: string,
    classId: string,
    isChecked: boolean,
    studentSupplies?: string[]
  ) => void
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
      <DialogContent className="mx-auto flex max-h-[90dvh] w-[calc(100%-1rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4">
          <DialogTitle className="flex items-center gap-2 text-lg text-primary">
            <Calendar className="h-5 w-5" />
            {formatDate(date)} 일정
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="space-y-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-base font-semibold text-foreground">{schedule.className}</h4>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-primary">
                    <Clock className="h-4 w-4 shrink-0" />
                    {schedule.time}
                  </p>
                </div>
                <Badge
                  variant={schedule.isConfirmed ? "default" : "secondary"}
                  className={
                    schedule.isConfirmed
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }
                >
                  {schedule.isConfirmed ? "확정" : "대기중"}
                </Badge>
              </div>

              <div className="space-y-2 border-t border-border pt-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>{schedule.venue}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="text-xs leading-relaxed">{schedule.address || schedule.region}</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  클래스 시간표
                </div>
                <div className="space-y-3">
                  {schedule.classes.map((item) => (
                    <ClassAssignmentRow
                      key={item.id}
                      scheduleId={schedule.id}
                      item={item}
                      isDeveloperMode={isDeveloperMode}
                      onClassCheck={onClassCheck}
                      onClassCancel={onClassCancel}
                    />
                  ))}
                </div>
              </div>

              {isDeveloperMode && !schedule.isConfirmed && (
                <Button
                  size="lg"
                  onClick={() => onConfirm(schedule.id)}
                  className="h-12 w-full bg-accent text-base text-accent-foreground hover:bg-accent/90"
                >
                  <Check className="mr-1 h-4 w-4" />
                  일정 확정하기
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-border p-4">
          <Button
            variant="outline"
            size="lg"
            className="h-12 w-full text-base"
            onClick={() => onOpenChange(false)}
          >
            <X className="mr-1 h-4 w-4" />
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
