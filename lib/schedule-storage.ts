import { Schedule, ScheduleChange, ScheduleClass } from "@/types/schedule"

const STORAGE_KEY = "schedules"
const CHANGES_KEY = "schedule_changes"

function createSwimitLaneClasses(prefix: string, time: string): ScheduleClass[] {
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
    classes: createSwimitLaneClasses("swimit-gimpo-20260614", "15:00~17:00"),
  },
  {
    date: "2026-06-21",
    region: "화성",
    venue: "수원 화성 와이풀앤와이에스씨",
    address: "경기도 화성시 반정동 153번길 9-10",
    className: "수영 특강 일정",
    time: "14:00~16:00",
    coachName: "",
    classes: createSwimitLaneClasses("swimit-hwaseong-20260621", "14:00~16:00"),
  },
  {
    date: "2026-06-28",
    region: "목동",
    venue: "서울 목동스포츠센터",
    address: "서울 양천구 목동서로 130",
    className: "수영 특강 일정",
    time: "14:00~16:00",
    coachName: "",
    classes: createSwimitLaneClasses("swimit-mokdong-20260628", "14:00~16:00"),
  },
]

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

function isSameSiteSchedule(schedule: Schedule, siteSchedule: Omit<Schedule, "id" | "createdAt" | "isConfirmed">) {
  return (
    schedule.date === siteSchedule.date &&
    schedule.region === siteSchedule.region &&
    schedule.venue === siteSchedule.venue
  )
}

export function getSchedules(): Schedule[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_KEY)
  if (!data) {
    console.info("[ScheduleSync] 기본 스윔잇 공개 일정을 불러옵니다.")
    return syncSwimitSchedules()
  }

  const schedules = JSON.parse(data).map(normalizeSchedule)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
  return syncSwimitSchedules()
}

export function saveSchedule(schedule: Omit<Schedule, "id" | "createdAt" | "isConfirmed">): Schedule {
  const schedules = getSchedules()
  const newSchedule = normalizeSchedule({
    ...schedule,
    id: createId(),
    isConfirmed: false,
    createdAt: new Date().toISOString(),
  })
  schedules.push(newSchedule)
  console.info("[ScheduleSync] 새 일정이 저장되었습니다.", {
    date: newSchedule.date,
    venue: newSchedule.venue,
    classCount: newSchedule.classes.length,
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
  return newSchedule
}

export function deleteSchedule(id: string): void {
  const schedules = getSchedules()
  const filtered = schedules.filter((s) => s.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

export function updateSchedule(
  id: string, 
  updates: Partial<Omit<Schedule, "id" | "createdAt">>
): { schedule: Schedule | null; change: ScheduleChange | null } {
  const schedules = getSchedules()
  const index = schedules.findIndex((s) => s.id === id)
  if (index === -1) return { schedule: null, change: null }
  
  const oldSchedule = schedules[index]
  let change: ScheduleChange | null = null
  
  // Track coach changes
  if (updates.coachName && updates.coachName !== oldSchedule.coachName) {
    change = {
      id: crypto.randomUUID(),
      scheduleId: id,
      previousCoach: oldSchedule.coachName,
      newCoach: updates.coachName,
      changedAt: new Date().toISOString(),
      notified: false,
    }
    saveChange(change)
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

  schedules[index] = normalizeSchedule({ 
    ...oldSchedule, 
    ...updates,
    ...(mergedClasses ? { classes: mergedClasses } : {}),
    updatedAt: new Date().toISOString()
  })
  console.info("[ScheduleSync] 일정이 수정되었습니다.", {
    scheduleId: id,
    date: schedules[index].date,
    venue: schedules[index].venue,
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
  return { schedule: schedules[index], change }
}

export function confirmSchedule(id: string): Schedule | null {
  const schedules = getSchedules()
  const index = schedules.findIndex((s) => s.id === id)
  if (index === -1) return null
  
  schedules[index] = { 
    ...schedules[index], 
    isConfirmed: true,
    updatedAt: new Date().toISOString()
  }
  console.info("[ScheduleSync] 일정 확정 상태가 저장되었습니다.", { scheduleId: id })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
  return schedules[index]
}

export function setClassChecked(scheduleId: string, classId: string, isChecked: boolean): Schedule | null {
  const schedules = getSchedules()
  const scheduleIndex = schedules.findIndex((s) => s.id === scheduleId)
  if (scheduleIndex === -1) return null

  const schedule = schedules[scheduleIndex]
  const classes = schedule.classes.map((item) =>
    item.id === classId
      ? {
          ...item,
          isCoachChecked: isChecked,
          checkedAt: isChecked ? new Date().toISOString() : undefined,
        }
      : item
  )

  schedules[scheduleIndex] = {
    ...schedule,
    classes,
    updatedAt: new Date().toISOString(),
  }

  console.info("[ScheduleSync] 코치 클래스 확인 상태가 저장되었습니다.", {
    scheduleId,
    classId,
    isChecked,
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
  return schedules[scheduleIndex]
}

export function syncSwimitSchedules(): Schedule[] {
  const schedules = getSchedulesWithoutSeed()
  const now = new Date().toISOString()
  let addedCount = 0

  SWIMIT_SITE_SCHEDULES.forEach((siteSchedule) => {
    const existingIndex = schedules.findIndex((schedule) => isSameSiteSchedule(schedule, siteSchedule))
    if (existingIndex !== -1) {
      if (shouldReplaceSiteClasses(schedules[existingIndex])) {
        schedules[existingIndex] = normalizeSchedule({
          ...schedules[existingIndex],
          className: siteSchedule.className,
          time: siteSchedule.time,
          classes: siteSchedule.classes,
          updatedAt: now,
        })
        addedCount += siteSchedule.classes.length - 1
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

  console.info("[ScheduleSync] 스윔잇 사이트 일정 동기화가 완료되었습니다.", { addedCount })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
  return schedules
}

function getSchedulesWithoutSeed(): Schedule[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data).map(normalizeSchedule) : []
}

function saveChange(change: ScheduleChange): void {
  const changes = getChanges()
  changes.push(change)
  localStorage.setItem(CHANGES_KEY, JSON.stringify(changes))
}

export function getChanges(): ScheduleChange[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(CHANGES_KEY)
  return data ? JSON.parse(data) : []
}

export function markChangeNotified(id: string): void {
  const changes = getChanges()
  const index = changes.findIndex((c) => c.id === id)
  if (index !== -1) {
    changes[index].notified = true
    localStorage.setItem(CHANGES_KEY, JSON.stringify(changes))
  }
}
