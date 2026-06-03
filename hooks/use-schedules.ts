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
  cancelClassAssignment,
  syncSwimitSchedulesFromRemote,
  getChanges,
  markChangeNotified,
} from "@/lib/schedule-storage"

export function useSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [changes, setChanges] = useState<ScheduleChange[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pendingChange, setPendingChange] = useState<ScheduleChange | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [nextSchedules, nextChanges] = await Promise.all([getSchedules(), getChanges()])
      setSchedules(nextSchedules)
      setChanges(nextChanges)
    } catch (error) {
      console.error("[ScheduleSync] 데이터 새로고침 실패", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    syncSwimitSchedulesFromRemote()
      .then(() => {
        console.info("[ScheduleSync] 앱 시작 시 최신 스윔잇 일정표 동기화가 완료되었습니다.")
        return refresh()
      })
      .catch((error) => {
        console.warn("[ScheduleSync] 앱 시작 시 최신 스윔잇 일정표 동기화에 실패했습니다.", error)
      })
  }, [refresh])

  const addSchedule = useCallback(
    async (schedule: Omit<Schedule, "id" | "createdAt" | "isConfirmed">) => {
      const newSchedule = await saveSchedule(schedule)
      await refresh()
      return newSchedule
    },
    [refresh]
  )

  const removeSchedule = useCallback(
    async (id: string) => {
      await deleteSchedule(id)
      await refresh()
    },
    [refresh]
  )

  const editSchedule = useCallback(
    async (id: string, updates: Partial<Omit<Schedule, "id" | "createdAt">>) => {
      const result = await updateSchedule(id, updates)
      if (result.change) {
        setPendingChange(result.change)
      }
      await refresh()
      return result.schedule
    },
    [refresh]
  )

  const confirm = useCallback(
    async (id: string) => {
      const result = await confirmSchedule(id)
      await refresh()
      return result
    },
    [refresh]
  )

  const checkScheduleClass = useCallback(
    async (scheduleId: string, classId: string, isChecked: boolean) => {
      const result = await setClassChecked(scheduleId, classId, isChecked)
      await refresh()
      return result
    },
    [refresh]
  )

  const cancelScheduleClass = useCallback(
    async (scheduleId: string, classId: string, reason: string) => {
      const result = await cancelClassAssignment(scheduleId, classId, reason)
      await refresh()
      return result
    },
    [refresh]
  )

  const syncFromSite = useCallback(async () => {
    const result = await syncSwimitSchedulesFromRemote()
    await refresh()
    return result
  }, [refresh])

  const dismissChange = useCallback(
    async (id: string) => {
      await markChangeNotified(id)
      setPendingChange(null)
      await refresh()
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
    cancelScheduleClass,
    syncFromSite,
    dismissChange,
    refresh,
  }
}
