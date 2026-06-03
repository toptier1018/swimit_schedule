export function formatCoachName(name: string): string {
  const trimmedName = name.trim()
  if (!trimmedName) return "미배정"
  if (trimmedName.endsWith("코치님")) return trimmedName
  if (trimmedName.endsWith("코치")) return `${trimmedName}님`
  return `${trimmedName} 코치님`
}
