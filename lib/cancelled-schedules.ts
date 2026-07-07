import { normalizeVenueName } from "@/lib/venue-display"

// 진행하지 않기로 확정된 일정 (스윔잇 원본 사이트에 있어도 목록에 표시하지 않음)
export const CANCELLED_SITE_SCHEDULES = [
  { date: "2026-08-09", venue: "서울 은평구 · 삼정스포츠 수영장" },
]

export function isCancelledSiteSchedule(date: string, venue: string): boolean {
  const normalizedVenue = normalizeVenueName(venue)
  return CANCELLED_SITE_SCHEDULES.some(
    (item) => item.date === date && normalizeVenueName(item.venue) === normalizedVenue
  )
}

export function filterCancelledSiteSchedules<T extends { date: string; venue: string }>(
  schedules: T[]
): T[] {
  const filtered = schedules.filter((schedule) => !isCancelledSiteSchedule(schedule.date, schedule.venue))

  if (filtered.length !== schedules.length) {
    console.info("[ScheduleSync] 취소된 일정을 제외했습니다.", {
      cancelledCount: schedules.length - filtered.length,
    })
  }

  return filtered
}
