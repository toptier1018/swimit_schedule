"use client"

import { Schedule } from "@/types/schedule"
import { Calendar, MapPin, Clock, User, Check, Pencil, Trash2, Building2, ClipboardCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScheduleForm } from "./schedule-form"

interface ScheduleCardProps {
  schedule: Schedule
  onEdit: (id: string, updates: Partial<Schedule>) => void
  onDelete: (id: string) => void
  onConfirm: (id: string) => void
  onClassCheck: (scheduleId: string, classId: string, isChecked: boolean) => void
}

export function ScheduleCard({ schedule, onEdit, onDelete, onConfirm, onClassCheck }: ScheduleCardProps) {
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
                <label
                  key={item.id}
                  className="flex items-start gap-3 rounded-md bg-card p-3 text-sm"
                >
                  <Checkbox
                    checked={item.isCoachChecked}
                    onCheckedChange={(checked) => onClassCheck(schedule.id, item.id, checked === true)}
                    className="mt-0.5"
                  />
                  <span className="flex-1">
                    <span className="block font-medium text-foreground">
                      {item.name} · {item.time}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
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
      </CardContent>
    </Card>
  )
}
