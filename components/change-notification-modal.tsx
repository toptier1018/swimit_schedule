"use client"

import { Schedule, ScheduleChange } from "@/types/schedule"
import { AlertTriangle, Phone, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface ChangeNotificationModalProps {
  change: ScheduleChange | null
  schedule: Schedule | undefined
  onDismiss: (id: string) => void
}

export function ChangeNotificationModal({ 
  change, 
  schedule, 
  onDismiss 
}: ChangeNotificationModalProps) {
  if (!change || !schedule) return null

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"]
    const weekday = weekdays[date.getDay()]
    return `${month}월 ${day}일 (${weekday})`
  }

  return (
    <Dialog open={!!change} onOpenChange={() => onDismiss(change.id)}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            코치 변경 알림
          </DialogTitle>
          <DialogDescription>
            일정 변경 사항을 확인하고 연락해주세요
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="rounded-lg bg-muted p-4 space-y-3">
            <div className="text-sm">
              <span className="text-muted-foreground">일정: </span>
              <span className="font-medium text-foreground">{schedule.className}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">날짜: </span>
              <span className="font-medium text-foreground">{formatDate(schedule.date)}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">장소: </span>
              <span className="font-medium text-foreground">{schedule.venue}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 py-2">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">이전 코치</p>
              <p className="font-medium text-foreground line-through">{change.previousCoach}</p>
            </div>
            <div className="text-2xl text-primary">→</div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">변경 코치</p>
              <p className="font-medium text-primary">{change.newCoach}</p>
            </div>
          </div>

          <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
            <p className="text-sm text-accent flex items-center gap-2">
              <Phone className="h-4 w-4" />
              코치님께 변경 사항을 연락해주세요!
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onDismiss(change.id)}
            >
              <X className="h-4 w-4 mr-1" />
              닫기
            </Button>
            <Button
              className="bg-accent hover:bg-accent/90"
              onClick={() => onDismiss(change.id)}
            >
              <Phone className="h-4 w-4 mr-1" />
              연락 완료
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
