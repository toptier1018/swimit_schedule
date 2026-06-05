import { Schedule } from "@/types/schedule"
import { NotionAssignmentRecord } from "@/lib/notion/types"

export async function fetchNotionAssignmentsFromApi(): Promise<NotionAssignmentRecord[]> {
  try {
    const response = await fetch("/api/notion/assignments", { cache: "no-store" })
    if (!response.ok) {
      throw new Error(`Notion 조회 실패: ${response.status}`)
    }

    const data = (await response.json()) as { records?: NotionAssignmentRecord[] }
    return data.records ?? []
  } catch (error) {
    console.warn("[Notion] 배정 기록을 불러오지 못했습니다.", error)
    return []
  }
}

export async function syncScheduleToNotionApi(schedule: Schedule): Promise<void> {
  try {
    const response = await fetch("/api/notion/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedule }),
    })

    if (!response.ok) {
      throw new Error(`Notion 저장 실패: ${response.status}`)
    }

    console.info("[Notion] 서버에 배정 정보를 저장했습니다.", {
      scheduleId: schedule.id,
      date: schedule.date,
      venue: schedule.venue,
    })
  } catch (error) {
    console.warn("[Notion] 배정 정보 저장에 실패했습니다.", error)
  }
}
