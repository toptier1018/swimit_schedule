import { NextResponse } from "next/server"
import { Schedule, ScheduleClass } from "@/types/schedule"

const SWIMIT_SOURCE_URL = "https://swimit.vercel.app/"

const CENTER_MARKERS = [
  {
    region: "김포",
    venue: "김포 아스타스포츠센터",
    marker: "김포 아스타스포츠센터 (김포)",
    addressFallback: "김포한강9로76번길 63 4층 407호, 408호, 409호",
    classPrefix: "swimit-gimpo",
  },
  {
    region: "화성",
    venue: "수원 화성 와이풀앤와이에스씨",
    marker: "수원 화성 와이풀앤와이에스씨 (화성)",
    addressFallback: "경기도 화성시 반정동 153번길 9-10",
    classPrefix: "swimit-hwaseong",
  },
  {
    region: "목동",
    venue: "서울 목동스포츠센터",
    marker: "서울 목동스포츠센터 (목동)",
    addressFallback: "서울 양천구 목동서로 130",
    classPrefix: "swimit-mokdong",
  },
]

function normalizeText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
}

function makeDate(year: number, month: string, day: string) {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
}

function createLaneClasses(prefix: string, time: string): ScheduleClass[] {
  return [
    {
      id: `${prefix}-lane-1`,
      lane: "1레인",
      name: "평영 A (초급)",
      time,
      coachName: "",
      seatStatus: "1자리 남음",
      bookingStatus: "결제가능",
      isOpen: true,
      isCoachChecked: false,
    },
    {
      id: `${prefix}-lane-2`,
      lane: "2레인",
      name: "접영 A (초급)",
      time,
      coachName: "",
      seatStatus: "마감",
      bookingStatus: "예약대기",
      isOpen: true,
      isCoachChecked: false,
    },
    {
      id: `${prefix}-lane-3`,
      lane: "3레인",
      name: "접영 B (중급)",
      time,
      coachName: "",
      seatStatus: "2자리 남음",
      bookingStatus: "결제가능",
      isOpen: true,
      isCoachChecked: false,
    },
    {
      id: `${prefix}-lane-4`,
      lane: "4레인",
      name: "자유형 A (초급)",
      time,
      coachName: "",
      seatStatus: "마감임박",
      bookingStatus: "결제가능",
      isOpen: true,
      isCoachChecked: false,
    },
    {
      id: `${prefix}-lane-5`,
      lane: "5레인",
      name: "운영 없음",
      time,
      coachName: "",
      seatStatus: "",
      bookingStatus: "운영 없음",
      isOpen: false,
      isCoachChecked: false,
    },
  ]
}

function parseLaneClasses(block: string, prefix: string, time: string) {
  const laneMatches = [...block.matchAll(/([1-9]레인)\s+(.+?)\s+(1자리 남음|2자리 남음|3자리 남음|4자리 남음|5자리 남음|6자리 남음|7자리 남음|마감임박|마감)?\s*(결제가능|예약대기|운영 없음)/g)]

  if (laneMatches.length === 0) {
    return createLaneClasses(prefix, time)
  }

  return laneMatches.map((match, index) => {
    const lane = match[1]
    const bookingStatus = match[4]
    const name = match[2].trim() || (bookingStatus === "운영 없음" ? "운영 없음" : `${index + 1}부`)

    return {
      id: `${prefix}-lane-${index + 1}`,
      lane,
      name,
      time,
      coachName: "",
      seatStatus: match[3] || "",
      bookingStatus,
      isOpen: bookingStatus !== "운영 없음",
      isCoachChecked: false,
    }
  })
}

function parseSchedules(pageText: string): Array<Omit<Schedule, "id" | "createdAt" | "isConfirmed">> {
  const pageYear = Number(pageText.match(/(\d{4})년\s*\d{1,2}월/)?.[1]) || new Date().getFullYear()

  return CENTER_MARKERS.flatMap((center, index) => {
    const start = pageText.indexOf(center.marker)
    if (start === -1) return []

    const nextStart = CENTER_MARKERS.slice(index + 1)
      .map((nextCenter) => pageText.indexOf(nextCenter.marker))
      .filter((nextIndex) => nextIndex > start)
      .sort((a, b) => a - b)[0]

    const block = pageText.slice(start, nextStart || undefined)
    const dateMatch = block.match(/(\d{1,2})월\s*(\d{1,2})일/)
    const timeMatch = block.match(/1부\s*([0-9]{1,2}:[0-9]{2}\s*~\s*[0-9]{1,2}:[0-9]{2})/)
    const addressMatch = block.match(/주소\s*(.+?)\s*예약\s*가능/)

    if (!dateMatch || !timeMatch) return []

    const date = makeDate(pageYear, dateMatch[1], dateMatch[2])
    const time = timeMatch[1].replace(/\s+/g, "")
    const classPrefix = `${center.classPrefix}-${date.replaceAll("-", "")}`

    return [
      {
        date,
        region: center.region,
        venue: center.venue,
        address: addressMatch?.[1]?.trim() || center.addressFallback,
        className: "수영 특강 일정",
        time,
        coachName: "",
        classes: parseLaneClasses(block, classPrefix, time),
      },
    ]
  })
}

export async function GET() {
  try {
    console.info("[SwimitSource] 스윔잇 공개 페이지에서 일정표를 가져옵니다.", {
      sourceUrl: SWIMIT_SOURCE_URL,
    })

    const response = await fetch(SWIMIT_SOURCE_URL, {
      cache: "no-store",
      headers: {
        "User-Agent": "swimit-schedule-sync/1.0",
      },
    })

    if (!response.ok) {
      throw new Error(`Swimit source responded with ${response.status}`)
    }

    const html = await response.text()
    const schedules = parseSchedules(normalizeText(html))

    console.info("[SwimitSource] 스윔잇 일정표 파싱이 완료되었습니다.", {
      scheduleCount: schedules.length,
    })

    return NextResponse.json({
      sourceUrl: SWIMIT_SOURCE_URL,
      fetchedAt: new Date().toISOString(),
      schedules,
    })
  } catch (error) {
    console.error("[SwimitSource] 스윔잇 일정표를 가져오지 못했습니다.", error)

    return NextResponse.json(
      {
        sourceUrl: SWIMIT_SOURCE_URL,
        fetchedAt: new Date().toISOString(),
        schedules: [],
        error: "스윔잇 공개 페이지에서 일정표를 가져오지 못했습니다.",
      },
      { status: 502 }
    )
  }
}
