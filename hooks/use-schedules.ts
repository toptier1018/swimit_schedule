"use client"

import { useState, useEffect, useCallback } from "react"
import { Schedule, ScheduleChange } from "@/types/schedule"
import {
  getSchedules,
  saveSchedule,
  deleteSchedule,
  updateSchedule,
  confirmSchedule,
  setClassChecked,
  syncSwimitSchedules,
  getChanges,
  markChangeNotified,
} from "@/lib/schedule-storage"

export function useSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [changes, setChanges] = useState<ScheduleChange[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pendingChange, setPendingChange] = useState<ScheduleChange | null>(null)

  const refresh = useCallback(() => {
    setSchedules(getSchedules())
    setChanges(getChanges())
    setIsLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addSchedule = useCallback(
    (schedule: Omit<Schedule, "id" | "createdAt" | "isConfirmed">) => {
      const newSchedule = saveSchedule(schedule)
      refresh()
      return newSchedule
    },
    [refresh]
  )

  const removeSchedule = useCallback(
    (id: string) => {
      deleteSchedule(id)
      refresh()
    },
    [refresh]
  )

  const editSchedule = useCallback(
    (id: string, updates: Partial<Omit<Schedule, "id" | "createdAt">>) => {
      const result = updateSchedule(id, updates)
      if (result.change) {
        setPendingChange(result.change)
      }
      refresh()
      return result.schedule
    },
    [refresh]
  )

  const confirm = useCallback(
    (id: string) => {
      const result = confirmSchedule(id)
      refresh()
      return result
    },
    [refresh]
  )

  const checkScheduleClass = useCallback(
    (scheduleId: string, classId: string, isChecked: boolean) => {
      const result = setClassChecked(scheduleId, classId, isChecked)
      refresh()
      return result
    },
    [refresh]
  )

  const syncFromSite = useCallback(() => {
    const result = syncSwimitSchedules()
    refresh()
    return result
  }, [refresh])

  const dismissChange = useCallback(
    (id: string) => {
      markChangeNotified(id)
      setPendingChange(null)
      refresh()
    },
    [refresh]
  )

  return {
    schedules,
    changes,
    isLoading,
    pendingChange,
    addSchedule,
    removeSchedule,
    editSchedule,
    confirmSchedule: confirm,
    checkScheduleClass,
    syncFromSite,
    dismissChange,
    refresh,
  }
}
