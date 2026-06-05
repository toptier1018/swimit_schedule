import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function loadEnvFile(filename) {
  const path = resolve(process.cwd(), filename)
  const content = readFileSync(path, "utf8")
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const index = trimmed.indexOf("=")
    if (index === -1) continue
    const key = trimmed.slice(0, index)
    const value = trimmed.slice(index + 1).replace(/^["']|["']$/g, "")
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvFile(".env.local")

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const NOTION_API_KEY = process.env.NOTION_API_KEY
const NOTION_DB_ID = (process.env.NOTION_SCHEDULE_DATABASE_ID || "").replace(
  /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
  "$1-$2-$3-$4-$5"
)

const NOTION_PROPS = {
  classTitle: "배정 클래스",
  date: "특강날짜",
  venue: "특강 장소",
  coachName: "코치님 성함",
  isChecked: "배정 완료 여부",
  isCancelled: "배정취소여부",
  cancelReason: "배정취소사유",
}

const VENUE_PLACES = {
  "김포 아스타스포츠센터": { lat: 37.615, lon: 126.715, name: "김포 아스타스포츠센터" },
  "수원 화성 와이풀앤와이에스씨": { lat: 37.206, lon: 127.07, name: "수원 화성 와이풀앤와이에스씨" },
  "서울 목동스포츠센터": { lat: 37.526, lon: 126.875, name: "서울 목동스포츠센터" },
}

function resolveVenuePlace(venue, address) {
  const matched = VENUE_PLACES[venue] ?? { lat: 37.5665, lon: 126.978, name: venue || "스윔잇 특강" }
  return { ...matched, address: address || undefined }
}

function buildClassTitle(item) {
  return item.is_open ? `${item.lane} · ${item.name}` : item.lane
}

async function supabaseFetch(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })
  if (!response.ok) throw new Error(`Supabase 오류 ${response.status}: ${await response.text()}`)
  return response.json()
}

async function notionRequest(path, options = {}) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })
  if (!response.ok) throw new Error(`Notion 오류 ${response.status}: ${await response.text()}`)
  return response.json()
}

function buildProperties(schedule, item) {
  const place = resolveVenuePlace(schedule.venue, schedule.address)
  const classTitle = buildClassTitle(item)
  return {
    [NOTION_PROPS.classTitle]: { title: [{ text: { content: classTitle } }] },
    [NOTION_PROPS.date]: { date: { start: schedule.date } },
    [NOTION_PROPS.venue]: { place },
    [NOTION_PROPS.coachName]: {
      rich_text: item.coach_name ? [{ text: { content: item.coach_name } }] : [],
    },
    [NOTION_PROPS.isChecked]: { checkbox: Boolean(item.is_coach_checked) },
    [NOTION_PROPS.isCancelled]: { checkbox: Boolean(item.cancellation_reason) },
    [NOTION_PROPS.cancelReason]: {
      rich_text: item.cancellation_reason ? [{ text: { content: item.cancellation_reason } }] : [],
    },
    classTitle,
  }
}

async function findExistingPage(classTitle, date) {
  const data = await notionRequest(`/databases/${NOTION_DB_ID}/query`, {
    method: "POST",
    body: JSON.stringify({
      filter: {
        and: [
          { property: NOTION_PROPS.classTitle, title: { equals: classTitle } },
          { property: NOTION_PROPS.date, date: { equals: date } },
        ],
      },
      page_size: 20,
    }),
  })
  return data.results?.[0]?.id ?? null
}

async function upsertAssignment(schedule, item) {
  const properties = buildProperties(schedule, item)
  const classTitle = properties.classTitle
  delete properties.classTitle

  const existingPageId = await findExistingPage(classTitle, schedule.date)
  if (existingPageId) {
    await notionRequest(`/pages/${existingPageId}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    })
    return { action: "updated", classTitle, coach: item.coach_name }
  }

  const created = await notionRequest("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: NOTION_DB_ID },
      properties,
    }),
  })
  return { action: "created", classTitle, coach: item.coach_name, pageId: created.id }
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY || !NOTION_API_KEY || !NOTION_DB_ID) {
    throw new Error(".env.local에 Supabase/Notion 환경변수가 필요합니다.")
  }

  const schedules = await supabaseFetch("schedules?select=*&order=date.asc")
  const scheduleIds = schedules.map((row) => row.id)
  const classes = scheduleIds.length
    ? await supabaseFetch(
        `schedule_classes?select=*&schedule_id=in.(${scheduleIds.map((id) => `"${id}"`).join(",")})`
      )
    : []

  const classesBySchedule = new Map()
  for (const item of classes) {
    const list = classesBySchedule.get(item.schedule_id) ?? []
    list.push(item)
    classesBySchedule.set(item.schedule_id, list)
  }

  let created = 0
  let updated = 0
  let assigned = 0
  let checked = 0

  for (const schedule of schedules) {
    const scheduleClasses = (classesBySchedule.get(schedule.id) ?? []).filter((item) => item.is_open)
    for (const item of scheduleClasses) {
      const result = await upsertAssignment(schedule, item)
      if (result.action === "created") created += 1
      else updated += 1
      if (item.coach_name?.trim()) assigned += 1
      if (item.is_coach_checked) checked += 1
      console.log(`[${result.action}] ${schedule.date} ${schedule.venue} / ${result.classTitle} / ${result.coach || "미배정"}`)
    }
  }

  console.log("\n=== 일괄 동기화 완료 ===")
  console.log(`일정: ${schedules.length}개`)
  console.log(`노션 새로 생성: ${created}개`)
  console.log(`노션 업데이트: ${updated}개`)
  console.log(`코치 배정됨: ${assigned}개`)
  console.log(`배정 완료: ${checked}개`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
