import { NextResponse } from "next/server"
import { Schedule } from "@/types/schedule"
import {
  fetchAllNotionAssignments,
  syncScheduleAssignmentsToNotion,
} from "@/lib/notion/assignment-service"
import { isNotionConfigured } from "@/lib/notion/config"

export async function GET() {
  if (!isNotionConfigured()) {
    return NextResponse.json({ records: [], configured: false })
  }

  try {
    const records = await fetchAllNotionAssignments()
    return NextResponse.json({ records, configured: true })
  } catch (error) {
    console.error("[Notion API] 배정 조회 실패", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Notion 조회 실패" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  if (!isNotionConfigured()) {
    return NextResponse.json({ ok: false, configured: false })
  }

  try {
    const body = (await request.json()) as { schedule?: Schedule }
    if (!body.schedule) {
      return NextResponse.json({ error: "schedule이 필요합니다." }, { status: 400 })
    }

    await syncScheduleAssignmentsToNotion(body.schedule)
    return NextResponse.json({ ok: true, configured: true })
  } catch (error) {
    console.error("[Notion API] 배정 저장 실패", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Notion 저장 실패" },
      { status: 500 }
    )
  }
}
