export const STUDENT_SUPPLY_OPTIONS = ["오리발", "패들", "스노클"] as const

export type StudentSupply = (typeof STUDENT_SUPPLY_OPTIONS)[number]

export function formatStudentSupplies(supplies?: string[]): string {
  if (!supplies?.length) return ""
  return supplies.join(", ")
}
