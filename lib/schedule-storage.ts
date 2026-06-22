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
import { syncScheduleToNotionApi } from "@/lib/notion/sync-client"
import { normalizeRegionName, normalizeVenueName } from "@/lib/venue-display"

const STORAGE_KEY = "schedules"
const CHANGES_KEY = "schedule_changes"

function createClass(
  prefix: string,
  index: number,
  lane: string,
  name: string,
  time: string,
  seatStatus: string,
  bookingStatus: string,
  coachName = ""
): ScheduleClass {
  return {
    id: `${prefix}-lane-${index}`,
    lane,
    name,
    time,
    coachName,
    seatStatus,
    bookingStatus,
    isOpen: bookingStatus !== "운영 없음",
    isCoachChecked: false,
  }
}

function createSamjeongLaneClasses(prefix: string, time: string): ScheduleClass[] {
  return [
    createClass(prefix, 1, "1레인", "운영 없음", time, "", "운영 없음"),
    createClass(prefix, 2, "2레인", "운영 없음", time, "", "운영 없음"),
    createClass(prefix, 3, "3레인", "접영 A (초급)", time, "2자리 남음", "결제가능", "황선웅"),
    createClass(prefix, 4, "4레인", "운영 없음", time, "", "운영 없음"),
    createClass(prefix, 5, "5레인", "자유형 A (초급)", time, "1자리 남음", "결제가능", "김형신"),
    createClass(prefix, 6, "6레인", "자유형 B (중급)", time, "마감임박", "결제가능", "이정민"),
  ]
}

function createSwimitLaneClasses(prefix: string, time: string, region: string): ScheduleClass[] {
  if (region.includes("화성")) {
    return [
      createClass(prefix, 1, "1레인", "운영 없음", time, "", "운영 없음"),
      createClass(prefix, 2, "2레인", "자유형 A (초급)", time, "마감임박", "결제가능"),
      createClass(prefix, 3, "3레인", "평영 A (초급)", time, "2자리 남음", "결제가능"),
      createClass(prefix, 4, "4레인", "접영 A (초급)", time, "마감임박", "결제가능"),
      createClass(prefix, 5, "5레인", "운영 없음", time, "", "운영 없음"),
      createClass(prefix, 6, "6레인", "운영 없음", time, "", "운영 없음"),
    ]
  }

  if (region.includes("목동")) {
    return [
      createClass(prefix, 1, "1레인", "평영 A (초급)", time, "1자리 남음", "결제가능"),
      createClass(prefix, 2, "2레인", "평영 B (중급)", time, "마감임박", "결제가능"),
      createClass(prefix, 3, "3레인", "접영 A (초급)", time, "2자리 남음", "결제가능"),
      createClass(prefix, 4, "4레인", "접영 B (중급)", time, "마감임박", "결제가능"),
      createClass(prefix, 5, "5레인", "자유형 A (초급)", time, "1자리 남음", "결제가능"),
      createClass(prefix, 6, "6레인", "자유형 B (중급)", time, "마감임박", "결제가능"),
    ]
  }

  if (region.includes("인천")) {
    return [
      createClass(prefix, 1, "1레인", "자유형 A (초급)", time, "1자리 남음", "결제가능"),
      createClass(prefix, 2, "2레인", "평영 A (초급)", time, "마감임박", "결제가능"),
      createClass(prefix, 3, "3레인", "접영 A (초급)", time, "2자리 남음", "결제가능"),
      createClass(prefix, 4, "4레인", "자유형 B (중급)", time, "마감임박", "결제가능"),
      createClass(prefix, 5, "5레인", "접영 B (중급)", time, "1자리 남음", "결제가능"),
    ]
  }

  if (region.includes("동탄")) {
    return [
      createClass(prefix, 1, "1레인", "평영 A (초급)", time, "1자리 남음", "결제가능"),
      createClass(prefix, 2, "2레인", "접영 A (초급)", time, "마감임박", "결제가능"),
      createClass(prefix, 3, "3레인", "자유형 A (초급)", time, "2자리 남음", "결제가능"),
      createClass(prefix, 4, "4레인", "접영 B (중급)", time, "마감임박", "결제가능"),
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
    region: "경기 김포",
    venue: "경기 김포 · 아스타스포츠센터",
    address: "김포한강9로76번길 63 4층 407호, 408호, 409호",
    className: "수영 특강 일정",
    time: "15:00~17:00",
    coachName: "",
    classes: createSwimitLaneClasses("swimit-gimpo-20260614", "15:00~17:00", "김포"),
  },
  {
    date: "2026-06-21",
    region: "경기 화성",
    venue: "경기 화성 · 와이풀앤와이에스씨",
    address: "경기도 화성시 반정동 153번길 9-10",
    className: "수영 특강 일정",
    time: "14:00~16:00",
    coachName: "",
    classes: createSwimitLaneClasses("swimit-hwaseong-20260621", "14:00~16:00", "화성"),
  },
  {
    date: "2026-06-28",
    region: "서울 목동",
    venue: "서울 목동 · 목동스포츠센터",
    address: "서울 양천구 목동서로 130",
    className: "수영 특강 일정",
    time: "14:00~16:00",
    coachName: "",
    classes: createSwimitLaneClasses("swimit-mokdong-20260628", "14:00~16:00", "목동"),
  },
  {
    date: "2026-07-05",
    region: "서울 은평구",
    venue: "서울 은평구 · 삼정스포츠 수영장",
    address: "서울 은평구 서오릉로 94 삼성타운아파트 지하2층",
    className: "수영 특강 일정",
    time: "09:00~11:00",
    coachName: "",
    classes: createSamjeongLaneClasses("swimit-samjeong-20260705", "09:00~11:00"),
  },
  {
    date: "2026-07-12",
    region: "인천 청라",
    venue: "인천 청라 · 청라스카이스위밍",
    address: "인천 서구 청라한내로 90 MK뷰 8층",
    className: "수영 특강 일정",
    time: "10:00~12:00",
    coachName: "",
    classes: createSwimitLaneClasses("swimit-cheongna-20260712", "10:00~12:00", "인천"),
  },
  {
    date: "2026-07-19",
    region: "경기 동탄",
    venue: "경기 동탄 · 스윔스튜디오제이",
    address: "경기도 화성시 동탄구 동탄신리천로 414 경서타워 4층 스윔스튜디오제이",
    className: "수영 특강 일정",
    time: "10:00~12:00",
    coachName: "",
    classes: createSwimitLaneClasses("swimit-dongtan-20260719", "10:00~12:00", "동탄"),
  },
  {
    date: "2026-07-26",
    region: "서울 목동",
    venue: "서울 목동 · 목동스포츠센터",
    address: "서울 양천구 목동서로 130",
    className: "수영 특강 일정",
    time: "10:00~12:00",
    coachName: "",
    classes: createSwimitLaneClasses("swimit-mokdong-20260726", "10:00~12:00", "목동"),
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
    studentSupplies: item.studentSupplies ?? [],
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
    region: normalizeRegionName(schedule.region || ""),
    venue: normalizeVenueName(schedule.venue || ""),
    className: schedule.className || primaryClass.name,
    time: schedule.time || primaryClass.time,
    coachName: schedule.coachName || primaryClass.coachName,
    classes,
  }
}

function shouldReplaceSiteClasses(schedule: Schedule) {
  return schedule.classes.length === 1 && schedule.classes[0]?.name === "1부"
}

function isSameSiteSchedule(schedule: Schedule, siteSchedule: Omit<Schedule, "id" | "createdAt" | "isConfirmed">) {
  // 같은 날짜 + 같은 장소면 동일 일정으로 봅니다.
  // (지역명을 "은평" -> "서울 은평구"처럼 바꿔도 중복이 생기지 않도록 region은 비교하지 않습니다.)
  return (
    schedule.date === siteSchedule.date &&
    normalizeVenueName(schedule.venue) === normalizeVenueName(siteSchedule.venue)
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

function timeToMinutes(value: string): number | null {
  const matched = value.trim().match(/(\d{1,2}):(\d{2})/)
  if (!matched) return null
  return Number(matched[1]) * 60 + Number(matched[2])
}

function getScheduleEndMinutes(time: string): number | null {
  const parts = time.split("~")
  const end = parts.length > 1 ? parts[1] : parts[0]
  return end ? timeToMinutes(end) : null
}

function getKoreaNowMinutes(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date())
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0")
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0")
  return hour * 60 + minute
}

// 수업 종료 시각이 지나면 화면에서만 숨깁니다. (DB·노션 데이터는 그대로 보존)
function isScheduleVisibleNow(date: string, time: string): boolean {
  const todayKey = getTodayKeyInKorea()
  if (date > todayKey) return true
  if (date < todayKey) return false

  const endMinutes = getScheduleEndMinutes(time)
  if (endMinutes == null) return true
  return getKoreaNowMinutes() <= endMinutes
}

async function finalizeSchedules(schedules: Schedule[]): Promise<Schedule[]> {
  const visible = schedules.filter((schedule) => isScheduleVisibleNow(schedule.date, schedule.time))

  if (visible.length !== schedules.length) {
    console.info("[ScheduleSync] 종료된 일정을 화면에서 숨겼습니다. (데이터는 보존)", {
      total: schedules.length,
      visible: visible.length,
      hidden: schedules.length - visible.length,
    })
  }

  return visible
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
  isChecked: boolean,
  studentSupplies?: string[]
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
          studentSupplies: isChecked ? studentSupplies ?? [] : [],
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
    studentSupplies: isChecked ? studentSupplies ?? [] : [],
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
  // 지난 일정도 DB·노션에는 그대로 보존합니다. (화면 표시는 finalizeSchedules에서 숨김 처리)
  const schedules = [...existingSchedules]
  const now = new Date().toISOString()
  let addedCount = 0
  // 실제로 새로 추가되거나 변경된 일정만 모읍니다. (불필요한 DB/노션 쓰기를 막아 로딩 속도 개선)
  const changedSchedules: Schedule[] = []

  upcomingSiteSchedules.forEach((siteSchedule) => {
    const existingIndex = schedules.findIndex((schedule) => isSameSiteSchedule(schedule, siteSchedule))
    if (existingIndex !== -1) {
      const existingSchedule = schedules[existingIndex]
      const shouldReplaceClasses = shouldReplaceSiteClasses(existingSchedule)
      const nextClasses = shouldReplaceClasses ? siteSchedule.classes : existingSchedule.classes
      const classChanged = JSON.stringify(existingSchedule.classes) !== JSON.stringify(nextClasses)
      const metaChanged =
        existingSchedule.region !== siteSchedule.region ||
        existingSchedule.className !== siteSchedule.className ||
        existingSchedule.time !== siteSchedule.time ||
        (Boolean(siteSchedule.address) && existingSchedule.address !== siteSchedule.address)

      if (!classChanged && !metaChanged) {
        return
      }

      const updatedSchedule = normalizeSchedule({
        ...existingSchedule,
        region: siteSchedule.region || existingSchedule.region,
        className: siteSchedule.className,
        time: siteSchedule.time,
        address: siteSchedule.address || existingSchedule.address,
        // Supabase에 저장된 기존 배정(코치명, 확인 상태, 준비물)은 원본 사이트가 덮어쓰지 않습니다.
        classes: nextClasses,
        updatedAt: classChanged || metaChanged ? now : existingSchedule.updatedAt,
      })

      schedules[existingIndex] = updatedSchedule
      changedSchedules.push(updatedSchedule)

      if (classChanged) {
        addedCount += Math.max(0, siteSchedule.classes.length - existingSchedule.classes.length)
      }
      return
    }

    const newSchedule = normalizeSchedule({
      ...siteSchedule,
      id: createId(),
      isConfirmed: false,
      createdAt: now,
    })
    schedules.push(newSchedule)
    changedSchedules.push(newSchedule)
    addedCount += 1
  })

  console.info("[ScheduleSync] 스윔잇 사이트 일정 동기화가 완료되었습니다.", {
    addedCount,
    changedCount: changedSchedules.length,
    sourceCount: siteSchedules.length,
    upcomingCount: upcomingSiteSchedules.length,
  })

  // 변경된 일정이 있을 때만 저장/동기화합니다. (매 로딩마다 전체를 다시 쓰지 않음)
  if (changedSchedules.length > 0) {
    if (isSupabaseConfigured()) {
      await persistSchedulesInDb(schedules)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
    }

    await Promise.all(changedSchedules.map((schedule) => pushScheduleToNotion(schedule)))
  }

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
