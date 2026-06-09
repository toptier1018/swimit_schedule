export const STUDENT_SUPPLY_OPTIONS = ["오리발", "패들", "스노클"] as const

export type StudentSupply = (typeof STUDENT_SUPPLY_OPTIONS)[number]

export function formatStudentSupplies(supplies?: string[]): string {
  if (!supplies?.length) return ""
  return supplies.join(", ")
}

export function parseStudentSupplies(text: string): string[] {
  if (!text.trim()) return []
  return text
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
}
