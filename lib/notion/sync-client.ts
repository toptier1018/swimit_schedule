import { Schedule } from "@/types/schedule"

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
