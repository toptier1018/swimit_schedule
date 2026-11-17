import { Schedule } from "@/types/schedule"

const EXPORT_HEADERS = [
  "날짜",
  "시간",
  "센터",
  "주소",
  "레인",
  "영법/클래스",
  "담당 코치",
  "배정 상태",
  "취소 사유",
]

function escapeCsvCell(value: string | undefined): string {
  const text = value ?? ""
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safeText.replaceAll('"', '""')}"`
}

function getAssignmentStatus(isCoachChecked: boolean, coachName: string) {
  if (isCoachChecked) return "배정 완료"
  return coachName ? "확인 전" : "미배정"
}

export function downloadPastSchedulesAsCsv(schedules: Schedule[]) {
  const rows = schedules.flatMap((schedule) =>
    schedule.classes.map((item) => [
      schedule.date,
      schedule.time,
      schedule.venue,
      schedule.address || schedule.region,
      item.lane,
      item.isOpen ? item.name : "운영 없음",
      item.coachName,
      getAssignmentStatus(item.isCoachChecked, item.coachName),
      item.cancellationReason,
    ])
  )

  const csv = [EXPORT_HEADERS, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\r\n")
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  const today = new Date().toISOString().slice(0, 10)

  anchor.href = url
  anchor.download = `스윔잇_지난특강기록_${today}.csv`
  anchor.click()
  URL.revokeObjectURL(url)

  console.info("[ScheduleExport] 과거 특강 기록 CSV를 내려받았습니다.", {
    scheduleCount: schedules.length,
    classCount: rows.length,
  })
}
