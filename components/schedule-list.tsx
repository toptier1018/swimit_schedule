"use client"

import { Schedule } from "@/types/schedule"
import { ScheduleCard } from "./schedule-card"

interface ScheduleListProps {
  schedules: Schedule[]
  onEdit: (id: string, updates: Partial<Schedule>) => void
  onDelete: (id: string) => void
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

export function ScheduleList({
  schedules,
  onEdit,
  onDelete,
  onConfirm,
  onClassCheck,
  onClassCancel,
  isDeveloperMode,
}: ScheduleListProps) {
  if (schedules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">등록된 일정이 없습니다</p>
      </div>
    )
  }

  const sortedSchedules = [...schedules].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime()
    if (dateDiff !== 0) return dateDiff
    return (a.time || "").localeCompare(b.time || "")
  })

  return (
    <div className="space-y-4">
      {sortedSchedules.map((schedule) => (
        <ScheduleCard
          key={schedule.id}
          schedule={schedule}
          onEdit={onEdit}
          onDelete={onDelete}
          onConfirm={onConfirm}
          onClassCheck={onClassCheck}
          onClassCancel={onClassCancel}
          isDeveloperMode={isDeveloperMode}
        />
      ))}
    </div>
  )
}
