"use client"

import { useState } from "react"
import { Schedule, ScheduleClass } from "@/types/schedule"
import { formatCoachName } from "@/lib/format-coach-name"
import { Calendar, MapPin, Clock, User, Check, Pencil, Trash2, Building2, ClipboardCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScheduleForm } from "./schedule-form"
import { ClassAssignmentRow } from "./class-assignment-row"

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
  const [teacherTargetClass, setTeacherTargetClass] = useState<ScheduleClass | null>(null)
  const [teacherName, setTeacherName] = useState("")

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"]
    const weekday = weekdays[date.getDay()]
    return `${month}월 ${day}일 (${weekday})`
  }

  const openTeacherDialog = (item: ScheduleClass) => {
    setTeacherTargetClass(item)
    setTeacherName(item.coachName)
  }

  const saveTeacherAssignment = () => {
    if (!teacherTargetClass) return

    const trimmedTeacherName = teacherName.trim()

    console.info("[DeveloperMode] 담당 선생님을 변경합니다.", {
      scheduleId: schedule.id,
      classId: teacherTargetClass.id,
      lane: teacherTargetClass.lane,
      previousTeacher: teacherTargetClass.coachName,
      nextTeacher: trimmedTeacherName,
    })

    onEdit(schedule.id, {
      classes: schedule.classes.map((item) => {
        if (item.id !== teacherTargetClass.id) return item

        const isSameTeacher = item.coachName === trimmedTeacherName

        return {
          ...item,
          coachName: trimmedTeacherName,
          isCoachChecked: isSameTeacher ? item.isCoachChecked : false,
          checkedAt: isSameTeacher ? item.checkedAt : undefined,
          cancellationReason: isSameTeacher ? item.cancellationReason : undefined,
          cancelledAt: isSameTeacher ? item.cancelledAt : undefined,
        }
      }),
    })

    setTeacherTargetClass(null)
    setTeacherName("")
  }

  const closeTeacherDialog = () => {
    setTeacherTargetClass(null)
    setTeacherName("")
  }

  return (
    <Card className="overflow-hidden border-border bg-card shadow-sm">
      <CardContent className="p-0">
        <div className="p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-base font-semibold text-primary">
              <Calendar className="h-5 w-5 shrink-0" />
              <span>{formatDate(schedule.date)}</span>
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

          <div className="mb-4 space-y-1">
            <p className="text-base font-medium text-foreground">{schedule.className}</p>
            <p className="flex items-center gap-1.5 text-sm text-primary">
              <Clock className="h-4 w-4 shrink-0" />
              {schedule.time}
            </p>
          </div>

          <div className="mb-4 rounded-xl border border-border bg-muted/40 p-3 sm:p-4">
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
                  onEditTeacher={isDeveloperMode ? openTeacherDialog : undefined}
                  onClassCheck={onClassCheck}
                  onClassCancel={onClassCancel}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{schedule.venue}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="text-xs leading-relaxed">{schedule.address || schedule.region}</span>
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
                className="h-11 flex-1 rounded-none text-accent hover:bg-accent/10 hover:text-accent"
              >
                <Check className="mr-1 h-4 w-4" />
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
                coachName: "",
                classes: schedule.classes,
              }}
              onSubmit={(data) => onEdit(schedule.id, data)}
              title="일정 수정"
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 flex-1 rounded-none text-muted-foreground hover:bg-primary/10 hover:text-primary"
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  수정
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(schedule.id)}
              className="h-11 flex-1 rounded-none text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              삭제
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog
        open={!!teacherTargetClass}
        onOpenChange={(open) => {
          if (!open) closeTeacherDialog()
        }}
      >
        <DialogContent className="mx-auto w-[calc(100%-2rem)] max-w-md sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <User className="h-5 w-5" />
              담당 선생님 변경
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium text-foreground">{teacherTargetClass?.lane}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                현재 담당: {formatCoachName(teacherTargetClass?.coachName || "")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`teacher-${teacherTargetClass?.id}`}>담당 선생님</Label>
              <Input
                id={`teacher-${teacherTargetClass?.id}`}
                value={teacherName}
                onChange={(event) => setTeacherName(event.target.value)}
                placeholder="예: 김코치"
                className="h-12 text-base"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">비워서 저장하면 미배정으로 바뀝니다.</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" className="h-11" onClick={closeTeacherDialog}>
                취소
              </Button>
              <Button className="h-11" onClick={saveTeacherAssignment}>
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
