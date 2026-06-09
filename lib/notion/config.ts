export const NOTION_API_VERSION = "2022-06-28"

export const NOTION_PROPERTY_NAMES = {
  classTitle: "배정 클래스",
  date: "특강날짜",
  venue: "특강 장소",
  coachName: "코치님 성함",
  isChecked: "배정 완료 여부",
  isCancelled: "배정취소여부",
  cancelReason: "배정취소사유",
  studentSupplies: "수강생준비물",
} as const

export function getNotionApiKey(): string | undefined {
  return process.env.NOTION_API_KEY
}

export function getNotionScheduleDatabaseId(): string | undefined {
  return process.env.NOTION_SCHEDULE_DATABASE_ID
}

export function isNotionConfigured(): boolean {
  return Boolean(getNotionApiKey() && getNotionScheduleDatabaseId())
}

export function formatNotionDatabaseId(id: string): string {
  const compact = id.replace(/-/g, "")
  if (compact.length !== 32) return id
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`
}
