interface VenuePlace {
  lat: number
  lon: number
  name: string
}

const VENUE_PLACES: Record<string, VenuePlace> = {
  "경기 김포 · 아스타스포츠센터": {
    lat: 37.615,
    lon: 126.715,
    name: "경기 김포 · 아스타스포츠센터",
  },
  "김포 아스타스포츠센터": {
    lat: 37.615,
    lon: 126.715,
    name: "경기 김포 · 아스타스포츠센터",
  },
  "경기 화성 · 와이풀앤와이에스씨": {
    lat: 37.206,
    lon: 127.07,
    name: "경기 화성 · 와이풀앤와이에스씨",
  },
  "수원 화성 와이풀앤와이에스씨": {
    lat: 37.206,
    lon: 127.07,
    name: "경기 화성 · 와이풀앤와이에스씨",
  },
  "서울 목동 · 목동스포츠센터": {
    lat: 37.526,
    lon: 126.875,
    name: "서울 목동 · 목동스포츠센터",
  },
  "서울 목동스포츠센터": {
    lat: 37.526,
    lon: 126.875,
    name: "서울 목동 · 목동스포츠센터",
  },
  "서울 은평구 · 삼정스포츠 수영장": {
    lat: 37.617,
    lon: 126.918,
    name: "서울 은평구 · 삼정스포츠 수영장",
  },
  "삼정스포츠 수영장": {
    lat: 37.617,
    lon: 126.918,
    name: "서울 은평구 · 삼정스포츠 수영장",
  },
  "인천 청라 · 청라스카이스위밍": {
    lat: 37.532,
    lon: 126.641,
    name: "인천 청라 · 청라스카이스위밍",
  },
  "청라스카이스위밍": {
    lat: 37.532,
    lon: 126.641,
    name: "인천 청라 · 청라스카이스위밍",
  },
  "경기 동탄 · 스윔스튜디오제이": {
    lat: 37.173,
    lon: 127.108,
    name: "경기 동탄 · 스윔스튜디오제이",
  },
  "스윔스튜디오제이": {
    lat: 37.173,
    lon: 127.108,
    name: "경기 동탄 · 스윔스튜디오제이",
  },
}

const DEFAULT_PLACE: VenuePlace = {
  lat: 37.5665,
  lon: 126.978,
  name: "스윔잇 특강",
}

export function resolveVenuePlace(venue: string, address?: string) {
  const matched = VENUE_PLACES[venue] ?? {
    ...DEFAULT_PLACE,
    name: venue || DEFAULT_PLACE.name,
  }

  return {
    lat: matched.lat,
    lon: matched.lon,
    name: matched.name,
    address: address || undefined,
  }
}
