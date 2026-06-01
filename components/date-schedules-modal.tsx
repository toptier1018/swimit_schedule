"use client"

import { Schedule } from "@/types/schedule"
import { Calendar, MapPin, Clock, User, Building2, Check, X, ClipboardCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
}

export function DateSchedulesModal({
  open,
  onOpenChange,
  date,
  schedules,
  onConfirm,
  onClassCheck,
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
                    <label key={item.id} className="flex items-start gap-3 rounded-md bg-card p-3">
                      <Checkbox
                        checked={item.isCoachChecked}
                        onCheckedChange={(checked) => onClassCheck(schedule.id, item.id, checked === true)}
                        className="mt-0.5"
                      />
                      <span className="flex-1 text-sm">
                        <span className="block font-medium text-foreground">
                          {item.name} · {item.time}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          담당 코치: {item.coachName || "미배정"}
                        </span>
                      </span>
                      <Badge variant={item.isCoachChecked ? "default" : "secondary"} className="shrink-0">
                        {item.isCoachChecked ? "확인 완료" : "확인 필요"}
                      </Badge>
                    </label>
                  ))}
                </div>
              </div>

              {!schedule.isConfirmed && (
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
