"use client"

import { useEffect, useState } from "react"
import { useSchedules } from "@/hooks/use-schedules"
import { Schedule } from "@/types/schedule"
import { ScheduleForm } from "@/components/schedule-form"
import { ScheduleList } from "@/components/schedule-list"
import { CalendarView } from "@/components/calendar-view"
import { DateSchedulesModal } from "@/components/date-schedules-modal"
import { ChangeNotificationModal } from "@/components/change-notification-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Calendar, Plus, RefreshCw, CheckCircle2 } from "lucide-react"

export default function Home() {
  const { 
    schedules, 
    isLoading, 
    pendingChange,
    addSchedule, 
    removeSchedule, 
    editSchedule,
    confirmSchedule,
    checkScheduleClass,
    cancelScheduleClass,
    syncFromSite,
    dismissChange 
  } = useSchedules()
  
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSchedules, setSelectedSchedules] = useState<Schedule[]>([])
  const [isDeveloperMode] = useState(() => {
    if (typeof window === "undefined") return false
    return new URLSearchParams(window.location.search).get("debug") === "true"
  })

  useEffect(() => {
    console.info("[DeveloperMode] URL 기반 개발자 모드 상태", { isDeveloperMode })
  }, [isDeveloperMode])

  const handleAddSchedule = (data: {
    date: string
    region: string
    venue: string
    address: string
    className: string
    time: string
    coachName: string
    classes: Schedule["classes"]
  }) => {
    addSchedule(data)
  }

  const handleEdit = (id: string, updates: Partial<Schedule>) => {
    editSchedule(id, updates)
  }

  const handleDelete = (id: string) => {
    if (confirm("정말 이 일정을 삭제하시겠습니까?")) {
      removeSchedule(id)
    }
  }

  const handleConfirm = (id: string) => {
    confirmSchedule(id)
  }

  const handleClassCheck = (
    scheduleId: string,
    classId: string,
    isChecked: boolean,
    studentSupplies?: string[]
  ) => {
    checkScheduleClass(scheduleId, classId, isChecked, studentSupplies)
  }

  const handleClassCancel = (scheduleId: string, classId: string, reason: string) => {
    cancelScheduleClass(scheduleId, classId, reason)
  }

  const handleSync = () => {
    console.info("[ScheduleSync] 사용자가 스윔잇 사이트 일정 동기화를 실행했습니다.")
    syncFromSite()
  }

  const handleDateSelect = (date: string, daySchedules: Schedule[]) => {
    setSelectedDate(date)
    setSelectedSchedules(daySchedules)
  }

  // 모든 일정을 날짜+시간 순으로 한 줄로 정렬합니다. (지역별로 묶지 않음)
  const sortedSchedules = [...schedules].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime()
    if (dateDiff !== 0) return dateDiff
    return (a.time || "").localeCompare(b.time || "")
  })

  const changedSchedule = pendingChange 
    ? schedules.find(s => s.id === pendingChange.scheduleId)
    : undefined
  const totalClasses = schedules.reduce((sum, schedule) => sum + schedule.classes.length, 0)
  const checkedClasses = schedules.reduce(
    (sum, schedule) => sum + schedule.classes.filter((item) => item.isCoachChecked).length,
    0
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {/* Header */}
      <header className="bg-primary px-4 py-4 text-primary-foreground sm:py-5">
        <div className="mx-auto max-w-lg sm:max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6" />
              <div>
                <h1 className="text-lg font-semibold sm:text-xl">스윔잇 특강 스케줄</h1>
                <p className="text-xs text-primary-foreground/80 sm:text-sm">
                  {isDeveloperMode
                    ? "개발자 모드: 선생님 배정과 일정 수정을 할 수 있어요"
                    : "코치님은 배정된 레인을 확인하거나 취소 사유를 남길 수 있어요"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:flex">
              {isDeveloperMode && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      window.location.href = "/"
                    }}
                    className="bg-card text-foreground hover:bg-card/90"
                  >
                    일반 화면 보기
                  </Button>
                  <Button variant="secondary" onClick={handleSync} className="bg-card text-foreground hover:bg-card/90">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    사이트 일정 동기화
                  </Button>
                  <ScheduleForm
                    onSubmit={handleAddSchedule}
                    trigger={
                      <Button variant="secondary" className="bg-card text-foreground hover:bg-card/90">
                        <Plus className="h-4 w-4 mr-2" />
                        새 일정 추가
                      </Button>
                    }
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-3 py-4 sm:max-w-6xl sm:px-4 sm:py-6">
        <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-5 sm:grid-cols-4 sm:gap-3">
          <Card className="border-border bg-card">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs text-muted-foreground">전체 일정</p>
              <p className="text-xl font-semibold text-foreground sm:text-2xl">{schedules.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs text-muted-foreground">클래스</p>
              <p className="text-xl font-semibold text-foreground sm:text-2xl">{totalClasses}</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 border-border bg-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 text-accent">
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-xs">코치 확인</p>
              </div>
              <p className="text-xl font-semibold text-foreground sm:text-2xl">{checkedClasses}/{totalClasses}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-5 border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-primary">
              <Calendar className="h-4 w-4" />
              클래스 운영 안내
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3 pt-0 text-sm sm:p-4 sm:pt-0">
            <p className="font-medium text-foreground">[클래스 운영 안내]</p>
            <p className="text-muted-foreground">
              기준 운영 인원에 미치지 못한 클래스는 통합 운영될 수 있습니다.
            </p>
            <p className="text-muted-foreground">
              특강 1주일 전 배정 조정이 필요한 코치님께는 개별 안내드리겠습니다.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Section */}
          <div className="lg:col-span-1">
            <Card className="border-border bg-card mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  수강 일정 달력
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <CalendarView
                  schedules={schedules}
                  onDateSelect={handleDateSelect}
                />
              </CardContent>
            </Card>
          </div>

          {/* Schedule List (시간순) */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4 text-primary">
              <MapPin className="h-5 w-5" />
              <h2 className="font-medium">다가오는 일정 (시간순)</h2>
            </div>

            {sortedSchedules.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>등록된 일정이 없습니다</p>
                  <p className="text-sm mt-1">새 일정을 추가해주세요</p>
                </CardContent>
              </Card>
            ) : (
              <ScheduleList
                schedules={sortedSchedules}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onConfirm={handleConfirm}
                onClassCheck={handleClassCheck}
                onClassCancel={handleClassCancel}
                isDeveloperMode={isDeveloperMode}
              />
            )}
          </div>
        </div>
      </main>

      {/* Date Schedules Modal */}
      {selectedDate && (
        <DateSchedulesModal
          open={!!selectedDate}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedDate(null)
              setSelectedSchedules([])
            }
          }}
          date={selectedDate}
          schedules={selectedSchedules}
          onConfirm={handleConfirm}
          onClassCheck={handleClassCheck}
          onClassCancel={handleClassCancel}
          isDeveloperMode={isDeveloperMode}
        />
      )}

      {/* Change Notification Modal */}
      <ChangeNotificationModal
        change={pendingChange}
        schedule={changedSchedule}
        onDismiss={dismissChange}
      />
    </div>
  )
}
