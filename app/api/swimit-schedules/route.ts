import { NextResponse } from "next/server"
import { Schedule, ScheduleClass } from "@/types/schedule"

const SWIMIT_SOURCE_URL = "https://swimit.vercel.app/"

interface SourceSchedule {
  id: number
  year: number
  location: string
  locationCode: string
  dateNum: number
  month: number
  venue: string
  address: string
  scheduleSummaryLines: string[]
}

interface SourceLane {
  lane: string
  title: string
  closed?: boolean
}

type SourceTable = Record<string, Array<{
  session: string
  time: string
  lanes: SourceLane[]
}>>

const SEAT_STATUS_BY_LANE: Record<string, string> = {
  "1레인": "1자리 남음",
  "2레인": "마감임박",
  "3레인": "2자리 남음",
  "4레인": "마감임박",
  "5레인": "1자리 남음",
}

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
  {
    region: "동탄",
    venue: "스윔스튜디오제이",
    marker: "스윔스튜디오제이 (동탄) (동탄)",
    addressFallback: "경기도 화성시 동탄구 동탄신리천로 414 경서타워 4층 스윔스튜디오제이",
    classPrefix: "swimit-dongtan",
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

function getTodayKeyInKorea() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function isUpcomingSchedule(date: string) {
  return date >= getTodayKeyInKorea()
}

function createClass(
  prefix: string,
  index: number,
  lane: string,
  name: string,
  time: string,
  seatStatus: string,
  bookingStatus: string
): ScheduleClass {
  return {
    id: `${prefix}-lane-${index}`,
    lane,
    name,
    time,
    coachName: "",
    seatStatus,
    bookingStatus,
    isOpen: bookingStatus !== "운영 없음",
    isCoachChecked: false,
  }
}

function createLaneClasses(prefix: string, time: string, region: string): ScheduleClass[] {
  if (region === "화성") {
    return [
      createClass(prefix, 1, "1레인", "운영 없음", time, "", "운영 없음"),
      createClass(prefix, 2, "2레인", "자유형 A (초급)", time, "마감임박", "결제가능"),
      createClass(prefix, 3, "3레인", "평영 A (초급)", time, "2자리 남음", "결제가능"),
      createClass(prefix, 4, "4레인", "접영 A (초급)", time, "마감임박", "결제가능"),
      createClass(prefix, 5, "5레인", "운영 없음", time, "", "운영 없음"),
      createClass(prefix, 6, "6레인", "운영 없음", time, "", "운영 없음"),
    ]
  }

  if (region === "목동") {
    return [
      createClass(prefix, 1, "1레인", "평영 A (초급)", time, "1자리 남음", "결제가능"),
      createClass(prefix, 2, "2레인", "평영 B (중급)", time, "마감임박", "결제가능"),
      createClass(prefix, 3, "3레인", "접영 A (초급)", time, "2자리 남음", "결제가능"),
      createClass(prefix, 4, "4레인", "접영 B (중급)", time, "마감임박", "결제가능"),
      createClass(prefix, 5, "5레인", "자유형 A (초급)", time, "1자리 남음", "결제가능"),
      createClass(prefix, 6, "6레인", "자유형 B (중급)", time, "마감임박", "결제가능"),
    ]
  }

  if (region === "동탄") {
    return [
      createClass(prefix, 1, "1레인", "평영 A (초급)", time, "1자리 남음", "결제가능"),
      createClass(prefix, 2, "2레인", "평영 B (중급)", time, "마감임박", "결제가능"),
      createClass(prefix, 3, "3레인", "접영 A (초급)", time, "2자리 남음", "결제가능"),
      createClass(prefix, 4, "4레인", "접영 B (중급)", time, "마감임박", "결제가능"),
      createClass(prefix, 5, "5레인", "자유형 A (초급)", time, "1자리 남음", "결제가능"),
      createClass(prefix, 6, "6레인", "자유형 B (중급)", time, "마감임박", "결제가능"),
    ]
  }

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

function parseLaneClasses(block: string, prefix: string, time: string, region: string) {
  const laneMatches = [...block.matchAll(/([1-9]레인)\s+(.+?)\s+(1자리 남음|2자리 남음|3자리 남음|4자리 남음|5자리 남음|6자리 남음|7자리 남음|마감임박|마감)?\s*(결제가능|예약대기|운영 없음)/g)]

  if (laneMatches.length === 0) {
    return createLaneClasses(prefix, time, region)
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

const REGION_ALIASES: Record<string, string> = {
  은평: "서울 은평구",
}

function getRegion(locationCode: string) {
  return REGION_ALIASES[locationCode] || locationCode || "기타"
}

function getVenue(location: string, venue: string) {
  if (location.includes("화성")) return "수원 화성 와이풀앤와이에스씨"
  if (location.includes("목동")) return "서울 목동스포츠센터"
  if (location.includes("김포")) return "김포 아스타스포츠센터"
  if (location.includes("삼정") || location.includes("은평")) return "삼정스포츠 수영장"
  if (location.includes("청라")) return "청라스카이스위밍"
  if (location.includes("스윔스튜디오제이") || location.includes("동탄")) return "스윔스튜디오제이"
  return location || venue
}

function getClassPrefix(source: SourceSchedule, date: string) {
  if (source.locationCode === "김포") return `swimit-gimpo-${date.replaceAll("-", "")}`
  if (source.locationCode === "화성") return `swimit-hwaseong-${date.replaceAll("-", "")}`
  if (source.locationCode === "목동") return `swimit-mokdong-${date.replaceAll("-", "")}`
  if (source.locationCode === "동탄") return `swimit-dongtan-${date.replaceAll("-", "")}`
  return `swimit-${source.id}-${date.replaceAll("-", "")}`
}

function getScriptUrls(html: string) {
  return [...html.matchAll(/src="([^"]+\.js[^"]*)"/g)].map((match) => {
    return new URL(match[1], SWIMIT_SOURCE_URL).toString()
  })
}

function extractEmbeddedSource(script: string) {
  const match = script.match(/let\s+\w+=(\[\{id:[\s\S]*?scheduleSummaryLines:[\s\S]*?\}\]),\w+=({[\s\S]*?}),\w+=\(\)=>/)
  if (!match) return null

  // The schedule app stores its data as JavaScript literals in the Next.js chunk.
  const sourceSchedules = Function(`"use strict"; return (${match[1]})`)() as SourceSchedule[]
  const sourceTable = Function(`"use strict"; return (${match[2]})`)() as SourceTable

  return { sourceSchedules, sourceTable }
}

async function parseEmbeddedSchedules(html: string) {
  for (const scriptUrl of getScriptUrls(html)) {
    const response = await fetch(scriptUrl, { cache: "no-store" })
    if (!response.ok) continue

    const script = await response.text()
    const embedded = extractEmbeddedSource(script)
    if (!embedded) continue

    console.info("[SwimitSource] 자바스크립트 번들에서 클래스 시간표를 찾았습니다.", {
      scriptUrl,
      scheduleCount: embedded.sourceSchedules.length,
    })

    const parsedSchedules = embedded.sourceSchedules.flatMap((source): Array<Omit<Schedule, "id" | "createdAt" | "isConfirmed">> => {
      const date = makeDate(source.year, String(source.month), String(source.dateNum))
      if (!isUpcomingSchedule(date)) return []

      const sourceSessions = embedded.sourceTable[String(source.id)] || []
      const firstTime = source.scheduleSummaryLines[0]?.replace(/^1부\s*/, "").replace(/\s+/g, "") || sourceSessions[0]?.time.replace(/\s+/g, "")
      if (!firstTime) return []

      const classPrefix = getClassPrefix(source, date)
      const classes = sourceSessions.flatMap((session, sessionIndex) =>
        session.lanes.map((lane, laneIndex) => {
          const time = session.time.replace(/\s+/g, "")
          const isClosed = Boolean(lane.closed) || !lane.title
          const className = isClosed ? "운영 없음" : lane.title

          return createClass(
            classPrefix,
            sessionIndex * 10 + laneIndex + 1,
            lane.lane,
            className,
            time,
            isClosed ? "" : SEAT_STATUS_BY_LANE[lane.lane] || "마감임박",
            isClosed ? "운영 없음" : "결제가능"
          )
        })
      )

      return [
        {
          date,
          region: getRegion(source.locationCode),
          venue: getVenue(source.location, source.venue),
          address: source.address,
          className: "수영 특강 일정",
          time: firstTime,
          coachName: "",
          classes,
        },
      ]
    })

    console.info("[SwimitSource] 지난 일정은 제외했습니다.", {
      sourceCount: embedded.sourceSchedules.length,
      upcomingCount: parsedSchedules.length,
    })

    return parsedSchedules
  }

  return []
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

    if (!isUpcomingSchedule(date)) return []

    return [
      {
        date,
        region: center.region,
        venue: center.venue,
        address: addressMatch?.[1]?.trim() || center.addressFallback,
        className: "수영 특강 일정",
        time,
        coachName: "",
        classes: parseLaneClasses(block, classPrefix, time, center.region),
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
    const embeddedSchedules = await parseEmbeddedSchedules(html)
    const schedules = embeddedSchedules.length > 0 ? embeddedSchedules : parseSchedules(normalizeText(html))

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
