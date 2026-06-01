"use client"

import { useState } from "react"
import { Schedule, ScheduleClass } from "@/types/schedule"
import { Calendar, MapPin, Clock, User, Check, Pencil, Trash2, Building2, ClipboardCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScheduleForm } from "./schedule-form"
import { AssignmentCancelModal } from "./assignment-cancel-modal"

interface ScheduleCardProps {
  schedule: Schedule
  onEdit: (id: string, updates: Partial<Schedule>) => void
  onDelete: (id: string) => void
  onConfirm: (id: string) => void
  onClassCheck: (scheduleId: string, classId: string, isChecked: boolean) => void
  onClassCancel: (scheduleId: string, classId: string, reason: string) => void
  isDeveloperMode: boolean
}

export function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
  onConfirm,
  onClassCheck,
  onClassCancel,
  isDeveloperMode,
}: ScheduleCardProps) {
  const [cancelTargetClass, setCancelTargetClass] = useState<ScheduleClass | null>(null)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"]
    const weekday = weekdays[date.getDay()]
    return `${month}월 ${day}일 (${weekday})`
  }

  return (
    <Card className="overflow-hidden border-border bg-card shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 text-primary font-medium">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(schedule.date)}</span>
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

          <div className="space-y-2 mb-4">
            <p className="text-sm font-medium text-foreground">{schedule.className}</p>
            <p className="text-sm text-primary flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {schedule.time}
            </p>
          </div>

          <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              클래스 시간표
            </div>
            <div className="space-y-2">
              {schedule.classes.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-md bg-card p-3 text-sm ${
                    item.isOpen ? "" : "opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{item.lane}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        담당 선생님: {item.coachName || "미배정"}
                      </p>
                      {item.cancellationReason && (
                        <p className="mt-1 text-xs text-destructive">
                          취소 사유: {item.cancellationReason}
                        </p>
                      )}
                    </div>
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
                        onClick={() => setCancelTargetClass(item)}
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

          <div className="space-y-2 text-sm text-muted-foreground border-t border-border pt-3">
            <div className="flex items-start gap-2">
              <Building2 className="h-4 w-4 mt-0.5 shrink-0" />
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
        </div>

        {isDeveloperMode && (
          <div className="flex border-t border-border">
            {!schedule.isConfirmed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onConfirm(schedule.id)}
                className="flex-1 rounded-none text-accent hover:text-accent hover:bg-accent/10"
              >
                <Check className="h-4 w-4 mr-1" />
                확정
              </Button>
            )}
            <ScheduleForm
              initialData={{
                date: schedule.date,
                region: schedule.region,
                venue: schedule.venue || "",
                address: schedule.address || "",
                className: schedule.className,
                time: schedule.time || "",
                coachName: schedule.coachName,
                classes: schedule.classes,
              }}
              onSubmit={(data) => onEdit(schedule.id, data)}
              title="일정 수정"
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 rounded-none text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  수정
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(schedule.id)}
              className="flex-1 rounded-none text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              삭제
            </Button>
          </div>
        )}
      </CardContent>
      <AssignmentCancelModal
        open={!!cancelTargetClass}
        classLabel={cancelTargetClass?.lane || ""}
        onOpenChange={(open) => {
          if (!open) setCancelTargetClass(null)
        }}
        onSubmit={(reason) => {
          if (!cancelTargetClass) return
          onClassCancel(schedule.id, cancelTargetClass.id, reason)
          setCancelTargetClass(null)
        }}
      />
    </Card>
  )
}
