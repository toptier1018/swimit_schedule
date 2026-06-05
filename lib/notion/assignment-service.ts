import { Schedule, ScheduleClass } from "@/types/schedule"
import {
  formatNotionDatabaseId,
  getNotionApiKey,
  getNotionScheduleDatabaseId,
  isNotionConfigured,
  NOTION_API_VERSION,
  NOTION_PROPERTY_NAMES,
} from "@/lib/notion/config"
import { resolveVenuePlace } from "@/lib/notion/venue-place"
import { NotionAssignmentInput, NotionAssignmentRecord } from "@/lib/notion/types"

type NotionRichText = { plain_text: string }
type NotionPage = {
  id: string
  properties: Record<string, unknown>
}

function notionHeaders() {
  const apiKey = getNotionApiKey()
  if (!apiKey) throw new Error("NOTION_API_KEY가 설정되지 않았습니다.")

  return {
    Authorization: `Bearer ${apiKey}`,
    "Notion-Version": NOTION_API_VERSION,
    "Content-Type": "application/json",
  }
}

function getDatabaseId() {
  const databaseId = getNotionScheduleDatabaseId()
  if (!databaseId) throw new Error("NOTION_SCHEDULE_DATABASE_ID가 설정되지 않았습니다.")
  return formatNotionDatabaseId(databaseId)
}

function readRichText(value: unknown): string {
  if (!value || typeof value !== "object") return ""
  const richText = (value as { rich_text?: NotionRichText[] }).rich_text
  return richText?.map((item) => item.plain_text).join("") ?? ""
}

function readTitle(value: unknown): string {
  if (!value || typeof value !== "object") return ""
  const title = (value as { title?: NotionRichText[] }).title
  return title?.map((item) => item.plain_text).join("") ?? ""
}

function readDate(value: unknown): string {
  if (!value || typeof value !== "object") return ""
  const date = (value as { date?: { start?: string | null } | null }).date
  return date?.start?.slice(0, 10) ?? ""
}

function readCheckbox(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  return Boolean((value as { checkbox?: boolean }).checkbox)
}

function readPlaceName(value: unknown): string {
  if (!value || typeof value !== "object") return ""
  const place = (value as { place?: { name?: string | null } | null }).place
  return place?.name ?? ""
}

function pageToRecord(page: NotionPage): NotionAssignmentRecord {
  const props = page.properties
  return {
    pageId: page.id,
    classTitle: readTitle(props[NOTION_PROPERTY_NAMES.classTitle]),
    date: readDate(props[NOTION_PROPERTY_NAMES.date]),
    venue: readPlaceName(props[NOTION_PROPERTY_NAMES.venue]),
    coachName: readRichText(props[NOTION_PROPERTY_NAMES.coachName]),
    isChecked: readCheckbox(props[NOTION_PROPERTY_NAMES.isChecked]),
    isCancelled: readCheckbox(props[NOTION_PROPERTY_NAMES.isCancelled]),
    cancelReason: readRichText(props[NOTION_PROPERTY_NAMES.cancelReason]),
  }
}

export function buildClassTitle(item: ScheduleClass): string {
  return item.isOpen ? `${item.lane} · ${item.name}` : item.lane
}

export function buildAssignmentInput(schedule: Schedule, item: ScheduleClass): NotionAssignmentInput {
  return {
    classTitle: buildClassTitle(item),
    date: schedule.date,
    venue: schedule.venue,
    address: schedule.address,
    coachName: item.coachName,
    isChecked: item.isCoachChecked,
    isCancelled: Boolean(item.cancellationReason),
    cancelReason: item.cancellationReason,
  }
}

function buildNotionProperties(input: NotionAssignmentInput) {
  const place = resolveVenuePlace(input.venue, input.address)

  return {
    [NOTION_PROPERTY_NAMES.classTitle]: {
      title: [{ text: { content: input.classTitle } }],
    },
    [NOTION_PROPERTY_NAMES.date]: {
      date: { start: input.date },
    },
    [NOTION_PROPERTY_NAMES.venue]: {
      place,
    },
    [NOTION_PROPERTY_NAMES.coachName]: {
      rich_text: input.coachName
        ? [{ text: { content: input.coachName } }]
        : [],
    },
    [NOTION_PROPERTY_NAMES.isChecked]: {
      checkbox: input.isChecked,
    },
    [NOTION_PROPERTY_NAMES.isCancelled]: {
      checkbox: input.isCancelled,
    },
    [NOTION_PROPERTY_NAMES.cancelReason]: {
      rich_text: input.cancelReason
        ? [{ text: { content: input.cancelReason } }]
        : [],
    },
  }
}

async function notionRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      ...notionHeaders(),
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Notion API 오류 (${response.status}): ${body}`)
  }

  return response.json() as Promise<T>
}

export async function fetchAllNotionAssignments(): Promise<NotionAssignmentRecord[]> {
  if (!isNotionConfigured()) return []

  const databaseId = getDatabaseId()
  const records: NotionAssignmentRecord[] = []
  let cursor: string | undefined

  do {
    const data = await notionRequest<{
      results: NotionPage[]
      has_more: boolean
      next_cursor: string | null
    }>(`/databases/${databaseId}/query`, {
      method: "POST",
      body: JSON.stringify({
        page_size: 100,
        start_cursor: cursor,
      }),
    })

    records.push(...data.results.map(pageToRecord))
    cursor = data.has_more ? data.next_cursor ?? undefined : undefined
  } while (cursor)

  console.info("[Notion] 배정 기록을 불러왔습니다.", { count: records.length })
  return records
}

async function findExistingPage(input: NotionAssignmentInput): Promise<string | null> {
  const databaseId = getDatabaseId()

  const data = await notionRequest<{ results: NotionPage[] }>(`/databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify({
      filter: {
        and: [
          {
            property: NOTION_PROPERTY_NAMES.classTitle,
            title: { equals: input.classTitle },
          },
          {
            property: NOTION_PROPERTY_NAMES.date,
            date: { equals: input.date },
          },
        ],
      },
      page_size: 20,
    }),
  })

  const matched = data.results
    .map(pageToRecord)
    .find((record) => record.venue === input.venue || !record.venue || !input.venue)

  return matched?.pageId ?? data.results[0]?.id ?? null
}

export async function upsertNotionAssignment(input: NotionAssignmentInput): Promise<string> {
  const properties = buildNotionProperties(input)
  const existingPageId = await findExistingPage(input)

  if (existingPageId) {
    await notionRequest(`/pages/${existingPageId}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    })

    console.info("[Notion] 배정 기록을 업데이트했습니다.", {
      pageId: existingPageId,
      classTitle: input.classTitle,
      date: input.date,
      coachName: input.coachName,
    })
    return existingPageId
  }

  const created = await notionRequest<{ id: string }>("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: getDatabaseId() },
      properties,
    }),
  })

  console.info("[Notion] 배정 기록을 새로 만들었습니다.", {
    pageId: created.id,
    classTitle: input.classTitle,
    date: input.date,
    coachName: input.coachName,
  })
  return created.id
}

export async function syncScheduleAssignmentsToNotion(schedule: Schedule): Promise<void> {
  if (!isNotionConfigured()) return

  const openClasses = schedule.classes.filter((item) => item.isOpen)
  await Promise.all(
    openClasses.map((item) => upsertNotionAssignment(buildAssignmentInput(schedule, item)))
  )

  console.info("[Notion] 일정의 배정 정보를 동기화했습니다.", {
    scheduleId: schedule.id,
    classCount: openClasses.length,
  })
}

export function mergeNotionAssignmentsIntoSchedules(
  schedules: Schedule[],
  records: NotionAssignmentRecord[]
): Schedule[] {
  if (records.length === 0) return schedules

  return schedules.map((schedule) => ({
    ...schedule,
    classes: schedule.classes.map((item) => {
      const classTitle = buildClassTitle(item)
      const record = records.find(
        (entry) =>
          entry.date === schedule.date &&
          entry.classTitle === classTitle &&
          (entry.venue === schedule.venue || !entry.venue)
      )

      if (!record) return item

      return {
        ...item,
        coachName: record.coachName || item.coachName,
        isCoachChecked: record.isChecked,
        checkedAt: record.isChecked ? item.checkedAt ?? new Date().toISOString() : undefined,
        cancellationReason: record.cancelReason || undefined,
        cancelledAt: record.isCancelled ? item.cancelledAt ?? new Date().toISOString() : undefined,
      }
    }),
  }))
}
