import { Schedule, ScheduleChange, ScheduleClass } from "@/types/schedule"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import {
  deleteScheduleFromDb,
  fetchAllSchedulesFromDb,
  fetchChangesFromDb,
  persistSchedulesInDb,
  updateChangeNotifiedInDb,
  upsertChangeInDb,
  upsertScheduleInDb,
} from "@/lib/supabase/schedule-repository"
import { mergeNotionAssignmentsIntoSchedules } from "@/lib/notion/assignment-service"
import { fetchNotionAssignmentsFromApi, syncScheduleToNotionApi } from "@/lib/notion/sync-client"

const STORAGE_KEY = "schedules"
const CHANGES_KEY = "schedule_changes"

function createClass(
  prefix: string,
  index: number,
  lane: string,
  name: string,
  time: string,
  seatStatus: string,
  bookingStatus: string
): ScheduleClass {
  return {
    id: `${prefix}-lane-${index}`,
    lane,
    name,
    time,
    coachName: "",
    seatStatus,
    bookingStatus,
    isOpen: bookingStatus !== "운영 없음",
    isCoachChecked: false,
  }
}

function createSwimitLaneClasses(prefix: string, time: string, region: string): ScheduleClass[] {
  if (region === "화성") {
    return [
      createClass(prefix, 1, "1레인", "운영 없음", time, "", "운영 없음"),
      createClass(prefix, 2, "2레인", "자유형 A (초급)", time, "마감임박", "결제가능"),
      createClass(prefix, 3, "3레인", "평영 A (초급)", time, "2자리 남음", "결제가능"),
      createClass(prefix, 4, "4레인", "접영 A (초급)", time, "마감임박", "결제가능"),
      createClass(prefix, 5, "5레인", "접영 B (중급)", time, "1자리 남음", "결제가능"),
      createClass(prefix, 6, "6레인", "자유형 B (중급)", time, "마감임박", "결제가능"),
    ]
  }

  if (region === "목동") {
    return [
      createClass(prefix, 1, "1레인", "평영 A (초급)", time, "1자리 남음", "결제가능"),
      createClass(prefix, 2, "2레인", "평영 B (중급)", time, "마감임박", "결제가능"),
      createClass(prefix, 3, "3레인", "접영 A (초급)", time, "2자리 남음", "결제가능"),
      createClass(prefix, 4, "4레인", "접영 B (중급)", time, "마감임박", "결제가능"),
      createClass(prefix, 5, "5레인", "자유형 A (초급)", time, "1자리 남음", "결제가능"),
      createClass(prefix, 6, "6레인", "자유형 B (중급)", time, "마감임박", "결제가능"),
    ]
  }

  return [
    {
      id: `${prefix}-lane-1`,
      lane: "1레인",
      name: "평영 A (초급)",
      time,
      coachName: "",
      seatStatus: "1자리 남음",
      bookingStatus: "결제가능",
      isOpen: true,
      isCoachChecked: false,
    },
    {
      id: `${prefix}-lane-2`,
      lane: "2레인",
      name: "접영 A (초급)",
      time,
      coachName: "",
      seatStatus: "마감",
      bookingStatus: "예약대기",
      isOpen: true,
      isCoachChecked: false,
    },
    {
      id: `${prefix}-lane-3`,
      lane: "3레인",
      name: "접영 B (중급)",
      time,
      coachName: "",
      seatStatus: "2자리 남음",
      bookingStatus: "결제가능",
      isOpen: true,
      isCoachChecked: false,
    },
    {
      id: `${prefix}-lane-4`,
      lane: "4레인",
      name: "자유형 A (초급)",
      time,
      coachName: "",
      seatStatus: "마감임박",
      bookingStatus: "결제가능",
      isOpen: true,
      isCoachChecked: false,
    },
    {
      id: `${prefix}-lane-5`,
      lane: "5레인",
      name: "운영 없음",
      time,
      coachName: "",
      seatStatus: "",
      bookingStatus: "운영 없음",
      isOpen: false,
      isCoachChecked: false,
    },
  ]
}

const SWIMIT_SITE_SCHEDULES: Array<Omit<Schedule, "id" | "createdAt" | "isConfirmed">> = [
  {
    date: "2026-06-14",
    region: "김포",
    venue: "김포 아스타스포츠센터",
    address: "김포한강9로76번길 63 4층 407호, 408호, 409호",
    className: "수영 특강 일정",
    time: "15:00~17:00",
    coachName: "",
    classes: createSwimitLaneClasses("swimit-gimpo-20260614", "15:00~17:00", "김포"),
  },
  {
    date: "2026-06-21",
    region: "화성",
    venue: "수원 화성 와이풀앤와이에스씨",
    address: "경기도 화성시 반정동 153번길 9-10",
    className: "수영 특강 일정",
    time: "14:00~16:00",
    coachName: "",
    classes: createSwimitLaneClasses("swimit-hwaseong-20260621", "14:00~16:00", "화성"),
  },
  {
    date: "2026-06-28",
    region: "목동",
    venue: "서울 목동스포츠센터",
    address: "서울 양천구 목동서로 130",
    className: "수영 특강 일정",
    time: "14:00~16:00",
    coachName: "",
    classes: createSwimitLaneClasses("swimit-mokdong-20260628", "14:00~16:00", "목동"),
  },
]

interface SwimitSourceResponse {
  schedules?: Array<Omit<Schedule, "id" | "createdAt" | "isConfirmed">>
  fetchedAt?: string
  sourceUrl?: string
}

function createId() {
  return crypto.randomUUID()
}

function normalizeClass(item: Partial<ScheduleClass>, fallbackIndex: number): ScheduleClass {
  return {
    id: item.id || createId(),
    name: item.name || `${fallbackIndex + 1}부`,
    lane: item.lane || `${fallbackIndex + 1}레인`,
    time: item.time || "",
    coachName: item.coachName || "",
    seatStatus: item.seatStatus || "",
    bookingStatus: item.bookingStatus || "",
    isOpen: item.isOpen ?? item.name !== "운영 없음",
    isCoachChecked: Boolean(item.isCoachChecked),
    checkedAt: item.checkedAt,
    cancellationReason: item.cancellationReason,
    cancelledAt: item.cancelledAt,
  }
}

function normalizeSchedule(schedule: Schedule): Schedule {
  const classes = schedule.classes?.length
    ? schedule.classes.map(normalizeClass)
    : [
        normalizeClass(
          {
            name: schedule.className || "1부",
            time: schedule.time || "",
            coachName: schedule.coachName || "",
            isCoachChecked: schedule.isConfirmed || false,
          },
          0
        ),
      ]

  const primaryClass = classes[0]

  return {
    ...schedule,
    className: schedule.className || primaryClass.name,
    time: schedule.time || primaryClass.time,
    coachName: schedule.coachName || primaryClass.coachName,
    classes,
  }
}

function shouldReplaceSiteClasses(schedule: Schedule) {
  return schedule.classes.length === 1 && schedule.classes[0]?.name === "1부"
}

function mergeClassesWithAssignments(existingClasses: ScheduleClass[], sourceClasses: ScheduleClass[]) {
  return sourceClasses.map((sourceClass) => {
    const existingClass = existingClasses.find((item) => item.lane === sourceClass.lane)
    const isSameClass =
      existingClass?.name === sourceClass.name &&
      existingClass?.time === sourceClass.time &&
      existingClass?.isOpen === sourceClass.isOpen

    if (!existingClass || !isSameClass) {
      return sourceClass
    }

    return {
      ...sourceClass,
      coachName: existingClass.coachName,
      isCoachChecked: existingClass.isCoachChecked,
      checkedAt: existingClass.checkedAt,
      cancellationReason: existingClass.cancellationReason,
      cancelledAt: existingClass.cancelledAt,
    }
  })
}

function isSameSiteSchedule(schedule: Schedule, siteSchedule: Omit<Schedule, "id" | "createdAt" | "isConfirmed">) {
  return (
    schedule.date === siteSchedule.date &&
    schedule.region === siteSchedule.region &&
    schedule.venue === siteSchedule.venue
  )
}

function getTodayKeyInKorea() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function isUpcomingSchedule(date: string) {
  return date >= getTodayKeyInKorea()
}

async function mergeSchedulesWithNotion(schedules: Schedule[]): Promise<Schedule[]> {
  const records = await fetchNotionAssignmentsFromApi()
  if (records.length === 0) return schedules

  const merged = mergeNotionAssignmentsIntoSchedules(schedules, records)
  const changed = JSON.stringify(merged) !== JSON.stringify(schedules)

  if (!changed) return merged

  console.info("[Notion] 노션에 저장된 배정 정보를 일정에 반영했습니다.", {
    recordCount: records.length,
  })

  if (isSupabaseConfigured()) {
    await persistSchedulesInDb(merged)
  } else if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  }

  return merged
}

async function finalizeSchedules(schedules: Schedule[]): Promise<Schedule[]> {
  return mergeSchedulesWithNotion(schedules)
}

async function pushScheduleToNotion(schedule: Schedule | null | undefined): Promise<void> {
  if (!schedule) return
  await syncScheduleToNotionApi(schedule)
}

function readLocalSchedules(): Schedule[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data).map(normalizeSchedule) : []
}

async function migrateLocalStorageToSupabaseIfNeeded(): Promise<void> {
  if (typeof window === "undefined" || !isSupabaseConfigured()) return

  const existing = await fetchAllSchedulesFromDb()
  if (existing.length > 0) return

  const localSchedules = readLocalSchedules()
  if (localSchedules.length === 0) return

  await persistSchedulesInDb(localSchedules)
  console.info("[Supabase] 브라우저에 있던 일정을 Supabase로 옮겼습니다.", {
    count: localSchedules.length,
  })
}

export async function getSchedules(): Promise<Schedule[]> {
  if (typeof window === "undefined") return []

  if (!isSupabaseConfigured()) {
    console.warn("[ScheduleSync] Supabase 미설정 — localStorage를 사용합니다.")
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return finalizeSchedules(await syncSwimitSchedules())
    const schedules = JSON.parse(data).map(normalizeSchedule)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
    return finalizeSchedules(await syncSwimitSchedules())
  }

  await migrateLocalStorageToSupabaseIfNeeded()
  let schedules = await fetchAllSchedulesFromDb()

  if (schedules.length === 0) {
    console.info("[ScheduleSync] DB가 비어 있어 기본 스윔잇 일정을 넣습니다.")
    return syncSwimitSchedules()
  }

  schedules = schedules.map(normalizeSchedule)
  return finalizeSchedules(await syncSwimitSchedulesWithExisting(schedules))
}

export async function saveSchedule(
  schedule: Omit<Schedule, "id" | "createdAt" | "isConfirmed">
): Promise<Schedule> {
  const newSchedule = normalizeSchedule({
    ...schedule,
    id: createId(),
    isConfirmed: false,
    createdAt: new Date().toISOString(),
  })

  if (isSupabaseConfigured()) {
    await upsertScheduleInDb(newSchedule)
  } else {
    const schedules = readLocalSchedules()
    schedules.push(newSchedule)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
  }

  console.info("[ScheduleSync] 새 일정이 저장되었습니다.", {
    date: newSchedule.date,
    venue: newSchedule.venue,
    classCount: newSchedule.classes.length,
  })
  await pushScheduleToNotion(newSchedule)
  return newSchedule
}

export async function deleteSchedule(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    await deleteScheduleFromDb(id)
    return
  }

  const schedules = readLocalSchedules().filter((s) => s.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
}

export async function updateSchedule(
  id: string,
  updates: Partial<Omit<Schedule, "id" | "createdAt">>
): Promise<{ schedule: Schedule | null; change: ScheduleChange | null }> {
  const schedules = isSupabaseConfigured() ? await fetchAllSchedulesFromDb() : readLocalSchedules()
  const index = schedules.findIndex((s) => s.id === id)
  if (index === -1) return { schedule: null, change: null }

  const oldSchedule = schedules[index]
  let change: ScheduleChange | null = null

  if (updates.coachName && updates.coachName !== oldSchedule.coachName) {
    change = {
      id: crypto.randomUUID(),
      scheduleId: id,
      previousCoach: oldSchedule.coachName,
      newCoach: updates.coachName,
      changedAt: new Date().toISOString(),
      notified: false,
    }
    await saveChange(change)
  }

  const mergedClasses = updates.classes?.map((item, classIndex) =>
    normalizeClass(
      {
        ...oldSchedule.classes[classIndex],
        ...item,
      },
      classIndex
    )
  )

  const updated = normalizeSchedule({
    ...oldSchedule,
    ...updates,
    ...(mergedClasses ? { classes: mergedClasses } : {}),
    updatedAt: new Date().toISOString(),
  })

  schedules[index] = updated

  if (isSupabaseConfigured()) {
    await upsertScheduleInDb(updated)
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
  }

  console.info("[ScheduleSync] 일정이 수정되었습니다.", {
    scheduleId: id,
    date: updated.date,
    venue: updated.venue,
  })
  await pushScheduleToNotion(updated)
  return { schedule: updated, change }
}

export async function confirmSchedule(id: string): Promise<Schedule | null> {
  const schedules = isSupabaseConfigured() ? await fetchAllSchedulesFromDb() : readLocalSchedules()
  const index = schedules.findIndex((s) => s.id === id)
  if (index === -1) return null

  const updated = {
    ...schedules[index],
    isConfirmed: true,
    updatedAt: new Date().toISOString(),
  }
  schedules[index] = updated

  if (isSupabaseConfigured()) {
    await upsertScheduleInDb(updated)
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
  }

  console.info("[ScheduleSync] 일정 확정 상태가 저장되었습니다.", { scheduleId: id })
  return updated
}

export async function setClassChecked(
  scheduleId: string,
  classId: string,
  isChecked: boolean
): Promise<Schedule | null> {
  const schedules = isSupabaseConfigured() ? await fetchAllSchedulesFromDb() : readLocalSchedules()
  const scheduleIndex = schedules.findIndex((s) => s.id === scheduleId)
  if (scheduleIndex === -1) return null

  const schedule = schedules[scheduleIndex]
  const classes = schedule.classes.map((item) =>
    item.id === classId
      ? {
          ...item,
          isCoachChecked: isChecked,
          checkedAt: isChecked ? new Date().toISOString() : undefined,
          cancellationReason: isChecked ? undefined : item.cancellationReason,
          cancelledAt: isChecked ? undefined : item.cancelledAt,
        }
      : item
  )

  const updated = {
    ...schedule,
    classes,
    updatedAt: new Date().toISOString(),
  }
  schedules[scheduleIndex] = updated

  if (isSupabaseConfigured()) {
    await upsertScheduleInDb(updated)
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
  }

  console.info("[ScheduleSync] 코치 클래스 확인 상태가 저장되었습니다.", {
    scheduleId,
    classId,
    isChecked,
  })
  await pushScheduleToNotion(updated)
  return updated
}

export async function cancelClassAssignment(
  scheduleId: string,
  classId: string,
  reason: string
): Promise<Schedule | null> {
  const schedules = isSupabaseConfigured() ? await fetchAllSchedulesFromDb() : readLocalSchedules()
  const scheduleIndex = schedules.findIndex((s) => s.id === scheduleId)
  if (scheduleIndex === -1) return null

  const schedule = schedules[scheduleIndex]
  const classes = schedule.classes.map((item) =>
    item.id === classId
      ? {
          ...item,
          isCoachChecked: false,
          checkedAt: undefined,
          cancellationReason: reason,
          cancelledAt: new Date().toISOString(),
        }
      : item
  )

  const updated = {
    ...schedule,
    classes,
    updatedAt: new Date().toISOString(),
  }
  schedules[scheduleIndex] = updated

  if (isSupabaseConfigured()) {
    await upsertScheduleInDb(updated)
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
  }

  console.info("[ScheduleSync] 코치 배정 취소 사유가 저장되었습니다.", {
    scheduleId,
    classId,
    reason,
  })
  await pushScheduleToNotion(updated)
  return updated
}

export async function syncSwimitSchedules(): Promise<Schedule[]> {
  const existing = isSupabaseConfigured()
    ? await fetchAllSchedulesFromDb()
    : readLocalSchedules()
  return finalizeSchedules(await mergeSwimitSchedules(SWIMIT_SITE_SCHEDULES, existing))
}

async function syncSwimitSchedulesWithExisting(existing: Schedule[]): Promise<Schedule[]> {
  return mergeSwimitSchedules(SWIMIT_SITE_SCHEDULES, existing)
}

export async function syncSwimitSchedulesFromRemote(): Promise<Schedule[]> {
  if (typeof window === "undefined") return []

  try {
    console.info("[ScheduleSync] 스윔잇 사이트에서 최신 일정표를 요청합니다.")

    const response = await fetch("/api/swimit-schedules", {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch Swimit schedules: ${response.status}`)
    }

    const data = (await response.json()) as SwimitSourceResponse
    const sourceSchedules = data.schedules?.length ? data.schedules : SWIMIT_SITE_SCHEDULES

    console.info("[ScheduleSync] 스윔잇 사이트 최신 일정표를 받았습니다.", {
      sourceUrl: data.sourceUrl,
      fetchedAt: data.fetchedAt,
      scheduleCount: sourceSchedules.length,
    })

    const existing = isSupabaseConfigured()
      ? await fetchAllSchedulesFromDb()
      : readLocalSchedules()
    return finalizeSchedules(await mergeSwimitSchedules(sourceSchedules, existing))
  } catch (error) {
    console.warn("[ScheduleSync] 최신 일정표 요청 실패로 기본 일정표를 사용합니다.", error)
    return syncSwimitSchedules()
  }
}

async function mergeSwimitSchedules(
  siteSchedules: Array<Omit<Schedule, "id" | "createdAt" | "isConfirmed">>,
  existingSchedules: Schedule[] = []
): Promise<Schedule[]> {
  const upcomingSiteSchedules = siteSchedules.filter((siteSchedule) => isUpcomingSchedule(siteSchedule.date))
  const schedules = existingSchedules.filter((schedule) => isUpcomingSchedule(schedule.date))
  const now = new Date().toISOString()
  let addedCount = 0

  upcomingSiteSchedules.forEach((siteSchedule) => {
    const existingIndex = schedules.findIndex((schedule) => isSameSiteSchedule(schedule, siteSchedule))
    if (existingIndex !== -1) {
      const existingSchedule = schedules[existingIndex]
      const mergedClasses = mergeClassesWithAssignments(existingSchedule.classes, siteSchedule.classes)
      const classChanged = JSON.stringify(existingSchedule.classes) !== JSON.stringify(mergedClasses)

      schedules[existingIndex] = normalizeSchedule({
        ...existingSchedule,
        className: siteSchedule.className,
        time: siteSchedule.time,
        address: siteSchedule.address || existingSchedule.address,
        classes: shouldReplaceSiteClasses(existingSchedule) ? siteSchedule.classes : mergedClasses,
        updatedAt: classChanged ? now : existingSchedule.updatedAt,
      })

      if (classChanged) {
        addedCount += Math.max(0, siteSchedule.classes.length - existingSchedule.classes.length)
      }
      return
    }

    schedules.push(
      normalizeSchedule({
        ...siteSchedule,
        id: createId(),
        isConfirmed: false,
        createdAt: now,
      })
    )
    addedCount += 1
  })

  console.info("[ScheduleSync] 스윔잇 사이트 일정 동기화가 완료되었습니다.", {
    addedCount,
    sourceCount: siteSchedules.length,
    upcomingCount: upcomingSiteSchedules.length,
  })

  if (isSupabaseConfigured()) {
    await persistSchedulesInDb(schedules)
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
  }

  await Promise.all(schedules.map((schedule) => pushScheduleToNotion(schedule)))

  return schedules
}

async function saveChange(change: ScheduleChange): Promise<void> {
  if (isSupabaseConfigured()) {
    await upsertChangeInDb(change)
    return
  }

  const changes = await getChanges()
  changes.push(change)
  localStorage.setItem(CHANGES_KEY, JSON.stringify(changes))
}

export async function getChanges(): Promise<ScheduleChange[]> {
  if (typeof window === "undefined") return []

  if (isSupabaseConfigured()) {
    return fetchChangesFromDb()
  }

  const data = localStorage.getItem(CHANGES_KEY)
  return data ? JSON.parse(data) : []
}

export async function markChangeNotified(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    await updateChangeNotifiedInDb(id)
    return
  }

  const changes = await getChanges()
  const index = changes.findIndex((c) => c.id === id)
  if (index !== -1) {
    changes[index].notified = true
    localStorage.setItem(CHANGES_KEY, JSON.stringify(changes))
  }
}
