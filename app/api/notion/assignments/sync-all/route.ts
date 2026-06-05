import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Schedule, ScheduleClass } from "@/types/schedule"
import { syncScheduleAssignmentsToNotion } from "@/lib/notion/assignment-service"
import { isNotionConfigured } from "@/lib/notion/config"

type ScheduleRow = {
  id: string
  date: string
  region: string
  venue: string
  address: string
  class_name: string
  time: string
  coach_name: string
  is_confirmed: boolean
  created_at: string
  updated_at: string | null
}

type ScheduleClassRow = {
  id: string
  schedule_id: string
  lane: string
  name: string
  class_time: string
  coach_name: string
  seat_status: string
  booking_status: string
  is_open: boolean
  is_coach_checked: boolean
  checked_at: string | null
  cancellation_reason: string | null
  cancelled_at: string | null
}

async function fetchAllSchedulesFromSupabase(): Promise<Schedule[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error("Supabase 환경변수가 없습니다.")

  const supabase = createClient(url, key)
  const { data: scheduleRows, error: scheduleError } = await supabase
    .from("schedules")
    .select("*")
    .order("date", { ascending: true })

  if (scheduleError) throw scheduleError
  if (!scheduleRows?.length) return []

  const scheduleIds = scheduleRows.map((row) => row.id as string)
  const { data: classRows, error: classError } = await supabase
    .from("schedule_classes")
    .select("*")
    .in("schedule_id", scheduleIds)

  if (classError) throw classError

  const classesBySchedule = new Map<string, ScheduleClass[]>()
  ;(classRows as ScheduleClassRow[] | null)?.forEach((row) => {
    const list = classesBySchedule.get(row.schedule_id) ?? []
    list.push({
      id: row.id,
      lane: row.lane,
      name: row.name,
      time: row.class_time,
      coachName: row.coach_name,
      seatStatus: row.seat_status,
      bookingStatus: row.booking_status,
      isOpen: row.is_open,
      isCoachChecked: row.is_coach_checked,
      checkedAt: row.checked_at ?? undefined,
      cancellationReason: row.cancellation_reason ?? undefined,
      cancelledAt: row.cancelled_at ?? undefined,
    })
    classesBySchedule.set(row.schedule_id, list)
  })

  return (scheduleRows as ScheduleRow[]).map((row) => ({
    id: row.id,
    date: row.date,
    region: row.region,
    venue: row.venue,
    address: row.address,
    className: row.class_name,
    time: row.time,
    coachName: row.coach_name,
    classes: (classesBySchedule.get(row.id) ?? []).sort((a, b) => a.lane.localeCompare(b.lane, "ko")),
    isConfirmed: row.is_confirmed,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  }))
}

export async function POST() {
  if (!isNotionConfigured()) {
    return NextResponse.json({ error: "Notion 환경변수가 없습니다." }, { status: 500 })
  }

  try {
    const schedules = await fetchAllSchedulesFromSupabase()
    let assignmentCount = 0

    for (const schedule of schedules) {
      await syncScheduleAssignmentsToNotion(schedule)
      assignmentCount += schedule.classes.filter((item) => item.isOpen).length
    }

    const assignedCount = schedules.reduce(
      (sum, schedule) =>
        sum + schedule.classes.filter((item) => item.isOpen && item.coachName.trim()).length,
      0
    )
    const checkedCount = schedules.reduce(
      (sum, schedule) =>
        sum + schedule.classes.filter((item) => item.isOpen && item.isCoachChecked).length,
      0
    )

    console.info("[Notion] 기존 배정 데이터 일괄 동기화 완료", {
      scheduleCount: schedules.length,
      assignmentCount,
      assignedCount,
      checkedCount,
    })

    return NextResponse.json({
      ok: true,
      scheduleCount: schedules.length,
      assignmentCount,
      assignedCount,
      checkedCount,
    })
  } catch (error) {
    console.error("[Notion API] 일괄 동기화 실패", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "일괄 동기화 실패" },
      { status: 500 }
    )
  }
}
