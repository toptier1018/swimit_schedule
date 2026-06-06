"use client"

import { useState, useMemo, useEffect } from "react"
import { Schedule } from "@/types/schedule"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getKoreaDateParts,
  getKoreaMonthStart,
  getTodayKeyInKorea,
  isSameKoreaMonth,
} from "@/lib/korea-date"

interface CalendarViewProps {
  schedules: Schedule[]
  onDateSelect: (date: string, schedules: Schedule[]) => void
}

export function CalendarView({ schedules, onDateSelect }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => getKoreaMonthStart())
  const [todayKey, setTodayKey] = useState(() => getTodayKeyInKorea())

  useEffect(() => {
    const snapToCurrentMonth = () => {
      setCurrentDate(getKoreaMonthStart())
      setTodayKey(getTodayKeyInKorea())
      console.info("[CalendarView] 한국 시간 기준 이번 달로 맞췄습니다.")
    }

    const refreshTodayMarker = () => {
      const monthStart = getKoreaMonthStart()
      setTodayKey(getTodayKeyInKorea())
      setCurrentDate((prev) => (isSameKoreaMonth(prev, monthStart) ? prev : monthStart))
    }

    snapToCurrentMonth()

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        snapToCurrentMonth()
      }
    }

    const intervalId = window.setInterval(refreshTodayMarker, 60_000)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  const { year, month } = getKoreaDateParts(currentDate)

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>()
    schedules.forEach((schedule) => {
      const existing = map.get(schedule.date) || []
      map.set(schedule.date, [...existing, schedule])
    })
    return map
  }, [schedules])

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()

  const goToCurrentMonth = () => {
    setCurrentDate(getKoreaMonthStart())
    setTodayKey(getTodayKeyInKorea())
    console.info("[CalendarView] 이번 달로 이동했습니다.", { year, month })
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1))
  }

  const formatDateKey = (day: number) => {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  const isToday = (day: number) => formatDateKey(day) === todayKey
  const isCurrentMonth = isSameKoreaMonth(currentDate, getKoreaMonthStart())

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"]

  const days = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-10" />)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(day)
    const daySchedules = schedulesByDate.get(dateKey) || []
    const hasSchedules = daySchedules.length > 0
    const hasConfirmed = daySchedules.some((s) => s.isConfirmed)
    const today = isToday(day)

    days.push(
      <button
        key={day}
        onClick={() => {
          if (hasSchedules) {
            onDateSelect(dateKey, daySchedules)
          }
        }}
        className={`
          h-10 w-full rounded-lg text-sm font-medium transition-all relative
          ${today ? "ring-2 ring-primary ring-offset-1" : ""}
          ${hasSchedules
            ? "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
            : "text-foreground hover:bg-muted cursor-default"
          }
          ${hasConfirmed ? "bg-accent/20 text-accent" : ""}
        `}
      >
        {day}
        {hasSchedules && (
          <span
            className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${hasConfirmed ? "bg-accent" : "bg-primary"}`}
          />
        )}
      </button>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 shrink-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <CardTitle className="text-base font-medium text-foreground">
              {year}년 {month}월
            </CardTitle>
            {!isCurrentMonth && (
              <Button
                variant="link"
                size="sm"
                className="h-auto px-0 text-xs text-primary"
                onClick={goToCurrentMonth}
              >
                오늘(이번 달)
              </Button>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 shrink-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="mb-2 grid grid-cols-7 gap-1">
          {weekdays.map((day, i) => (
            <div
              key={day}
              className={`flex h-8 items-center justify-center text-xs font-medium ${
                i === 0 ? "text-destructive" : i === 6 ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">{days}</div>
        <div className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span>특강 일정</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span>확정</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full ring-2 ring-primary ring-offset-1" />
            <span>오늘</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
