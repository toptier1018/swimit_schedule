const KOREA_TIME_ZONE = "Asia/Seoul"

export function getKoreaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KOREA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const year = Number(parts.find((part) => part.type === "year")?.value)
  const month = Number(parts.find((part) => part.type === "month")?.value)
  const day = Number(parts.find((part) => part.type === "day")?.value)

  return { year, month, day }
}

export function getTodayKeyInKorea(date = new Date()) {
  const { year, month, day } = getKoreaDateParts(date)
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function getKoreaMonthStart(date = new Date()) {
  const { year, month } = getKoreaDateParts(date)
  return new Date(year, month - 1, 1)
}

export function isSameKoreaMonth(left: Date, right: Date) {
  const a = getKoreaDateParts(left)
  const b = getKoreaDateParts(right)
  return a.year === b.year && a.month === b.month
}
