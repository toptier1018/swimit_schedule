const VENUE_DISPLAY_BY_KEY: Record<string, string> = {
  "김포 아스타스포츠센터": "경기 김포 · 아스타스포츠센터",
  "수원 화성 와이풀앤와이에스씨": "경기 화성 · 와이풀앤와이에스씨",
  "서울 목동스포츠센터": "서울 목동 · 목동스포츠센터",
  "삼정스포츠 수영장": "서울 은평구 · 삼정스포츠 수영장",
  "청라스카이스위밍": "인천 청라 · 청라스카이스위밍",
  "스윔스튜디오제이": "경기 동탄 · 스윔스튜디오제이",
}

const REGION_DISPLAY_BY_KEY: Record<string, string> = {
  김포: "경기 김포",
  화성: "경기 화성",
  목동: "서울 목동",
  은평: "서울 은평구",
  "서울 은평구": "서울 은평구",
  인천: "인천 청라",
  동탄: "경기 동탄",
}

export function normalizeRegionName(region: string): string {
  return REGION_DISPLAY_BY_KEY[region] || region
}

export function normalizeVenueName(venue: string): string {
  if (!venue) return venue

  const matchedKey = Object.keys(VENUE_DISPLAY_BY_KEY).find((key) => venue.includes(key))
  return matchedKey ? VENUE_DISPLAY_BY_KEY[matchedKey] : venue
}
