import { Schedule, ScheduleChange, ScheduleClass } from "@/types/schedule"
import { getSupabaseClient } from "@/lib/supabase/client"

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

type ScheduleChangeRow = {
  id: string
  schedule_id: string
  previous_coach: string
  new_coach: string
  changed_at: string
  notified: boolean
}

function rowToClass(row: ScheduleClassRow): ScheduleClass {
  return {
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
  }
}

function classToRow(scheduleId: string, item: ScheduleClass): ScheduleClassRow {
  return {
    id: item.id,
    schedule_id: scheduleId,
    lane: item.lane,
    name: item.name,
    class_time: item.time,
    coach_name: item.coachName,
    seat_status: item.seatStatus,
    booking_status: item.bookingStatus,
    is_open: item.isOpen,
    is_coach_checked: item.isCoachChecked,
    checked_at: item.checkedAt ?? null,
    cancellation_reason: item.cancellationReason ?? null,
    cancelled_at: item.cancelledAt ?? null,
  }
}

function rowToSchedule(row: ScheduleRow, classes: ScheduleClass[]): Schedule {
  return {
    id: row.id,
    date: row.date,
    region: row.region,
    venue: row.venue,
    address: row.address,
    className: row.class_name,
    time: row.time,
    coachName: row.coach_name,
    classes,
    isConfirmed: row.is_confirmed,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  }
}

function scheduleToRow(schedule: Schedule): ScheduleRow {
  return {
    id: schedule.id,
    date: schedule.date,
    region: schedule.region,
    venue: schedule.venue,
    address: schedule.address,
    class_name: schedule.className,
    time: schedule.time,
    coach_name: schedule.coachName,
    is_confirmed: schedule.isConfirmed,
    created_at: schedule.createdAt,
    updated_at: schedule.updatedAt ?? null,
  }
}

export async function fetchAllSchedulesFromDb(): Promise<Schedule[]> {
  const supabase = getSupabaseClient()

  const { data: scheduleRows, error: scheduleError } = await supabase
    .from("schedules")
    .select("*")
    .order("date", { ascending: true })

  if (scheduleError) {
    console.error("[Supabase] 일정 목록 조회 실패", scheduleError)
    throw scheduleError
  }

  if (!scheduleRows?.length) {
    console.info("[Supabase] 저장된 일정이 없습니다.")
    return []
  }

  const scheduleIds = scheduleRows.map((row) => row.id as string)
  const { data: classRows, error: classError } = await supabase
    .from("schedule_classes")
    .select("*")
    .in("schedule_id", scheduleIds)

  if (classError) {
    console.error("[Supabase] 클래스 목록 조회 실패", classError)
    throw classError
  }

  const classesBySchedule = new Map<string, ScheduleClass[]>()
  ;(classRows as ScheduleClassRow[] | null)?.forEach((row) => {
    const list = classesBySchedule.get(row.schedule_id) ?? []
    list.push(rowToClass(row))
    classesBySchedule.set(row.schedule_id, list)
  })

  const schedules = (scheduleRows as ScheduleRow[]).map((row) => {
    const classes = (classesBySchedule.get(row.id) ?? []).sort((a, b) =>
      a.lane.localeCompare(b.lane, "ko")
    )
    return rowToSchedule(row, classes)
  })

  console.info("[Supabase] 일정을 불러왔습니다.", { count: schedules.length })
  return schedules
}

export async function upsertScheduleInDb(schedule: Schedule): Promise<void> {
  const supabase = getSupabaseClient()
  const row = scheduleToRow(schedule)

  const { error: scheduleError } = await supabase.from("schedules").upsert(row, { onConflict: "id" })
  if (scheduleError) {
    console.error("[Supabase] 일정 저장 실패", { scheduleId: schedule.id, scheduleError })
    throw scheduleError
  }

  const classRows = schedule.classes.map((item) => classToRow(schedule.id, item))
  const keepClassIds = new Set(classRows.map((row) => row.id))

  const { data: existingClassRows, error: existingClassError } = await supabase
    .from("schedule_classes")
    .select("id")
    .eq("schedule_id", schedule.id)

  if (existingClassError) {
    console.warn("[Supabase] 기존 클래스 ID 조회 실패", existingClassError)
  } else {
    const orphanClassIds = (existingClassRows ?? [])
      .map((row) => row.id as string)
      .filter((id) => !keepClassIds.has(id))

    if (orphanClassIds.length > 0) {
      const { error: deleteClassError } = await supabase
        .from("schedule_classes")
        .delete()
        .in("id", orphanClassIds)
      if (deleteClassError) {
        console.warn("[Supabase] 사용하지 않는 클래스 삭제 실패", deleteClassError)
      }
    }
  }

  if (classRows.length > 0) {
    const { error: classError } = await supabase
      .from("schedule_classes")
      .upsert(classRows, { onConflict: "id" })
    if (classError) {
      console.error("[Supabase] 클래스 저장 실패", { scheduleId: schedule.id, classError })
      throw classError
    }
  }

  console.info("[Supabase] 일정이 저장되었습니다.", {
    scheduleId: schedule.id,
    date: schedule.date,
    classCount: schedule.classes.length,
  })
}

export async function persistSchedulesInDb(schedules: Schedule[]): Promise<void> {
  for (const schedule of schedules) {
    await upsertScheduleInDb(schedule)
  }

  const supabase = getSupabaseClient()
  const keepIds = schedules.map((item) => item.id)

  if (keepIds.length === 0) {
    console.info("[Supabase] 저장할 일정이 없어 기존 데이터는 그대로 둡니다.")
    return
  }

  const { data: existingRows, error: listError } = await supabase.from("schedules").select("id")
  if (listError) {
    console.warn("[Supabase] 기존 일정 ID 조회 실패", listError)
    return
  }

  const orphanIds = (existingRows ?? [])
    .map((row) => row.id as string)
    .filter((id) => !keepIds.includes(id))

  if (orphanIds.length > 0) {
    const { error: deleteError } = await supabase.from("schedules").delete().in("id", orphanIds)
    if (deleteError) {
      console.warn("[Supabase] 사용하지 않는 일정 삭제 실패", { orphanIds, deleteError })
    } else {
      console.info("[Supabase] 사용하지 않는 일정을 삭제했습니다.", { count: orphanIds.length })
    }
  }
}

export async function deleteScheduleFromDb(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("schedules").delete().eq("id", id)
  if (error) {
    console.error("[Supabase] 일정 삭제 실패", { id, error })
    throw error
  }
  console.info("[Supabase] 일정이 삭제되었습니다.", { id })
}

export async function fetchChangesFromDb(): Promise<ScheduleChange[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("schedule_changes")
    .select("*")
    .order("changed_at", { ascending: false })

  if (error) {
    console.error("[Supabase] 변경 이력 조회 실패", error)
    throw error
  }

  return ((data ?? []) as ScheduleChangeRow[]).map((row) => ({
    id: row.id,
    scheduleId: row.schedule_id,
    previousCoach: row.previous_coach,
    newCoach: row.new_coach,
    changedAt: row.changed_at,
    notified: row.notified,
  }))
}

export async function upsertChangeInDb(change: ScheduleChange): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("schedule_changes").upsert(
    {
      id: change.id,
      schedule_id: change.scheduleId,
      previous_coach: change.previousCoach,
      new_coach: change.newCoach,
      changed_at: change.changedAt,
      notified: change.notified,
    },
    { onConflict: "id" }
  )

  if (error) {
    console.error("[Supabase] 변경 이력 저장 실패", error)
    throw error
  }
}

export async function updateChangeNotifiedInDb(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("schedule_changes").update({ notified: true }).eq("id", id)
  if (error) {
    console.error("[Supabase] 변경 알림 상태 저장 실패", { id, error })
    throw error
  }
}
