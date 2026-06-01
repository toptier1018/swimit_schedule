"use client"

import { useState } from "react"
import { ScheduleClass } from "@/types/schedule"
import { Calendar, MapPin, Clock, User, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ScheduleFormProps {
  onSubmit: (schedule: {
    date: string
    region: string
    venue: string
    address: string
    className: string
    time: string
    coachName: string
    classes: ScheduleClass[]
  }) => void
  initialData?: {
    date: string
    region: string
    venue: string
    address: string
    className: string
    time: string
    coachName: string
    classes?: ScheduleClass[]
  }
  trigger?: React.ReactNode
  title?: string
}

export function ScheduleForm({
  onSubmit,
  initialData,
  trigger,
  title = "새 일정 추가",
}: ScheduleFormProps) {
  const [open, setOpen] = useState(false)
  const initialClasses = initialData?.classes?.length
    ? initialData.classes
    : [
        {
          id: "",
          name: "1부",
          lane: "1레인",
          time: initialData?.time || "",
          coachName: initialData?.coachName || "",
          seatStatus: "",
          bookingStatus: "",
          isOpen: true,
          isCoachChecked: false,
        },
      ]
  const [formData, setFormData] = useState({
    date: initialData?.date || "",
    region: initialData?.region || "",
    venue: initialData?.venue || "",
    address: initialData?.address || "",
    className: initialData?.className || "",
    time: initialData?.time || "",
    coachName: initialData?.coachName || "",
    classLines: initialClasses
      .map((item) =>
        `${item.lane} | ${item.name} | ${item.time} | ${item.seatStatus} | ${item.bookingStatus} | ${item.coachName}`
      )
      .join("\n"),
  })

  const parseClassLines = () => {
    const parsed = formData.classLines
      .split("\n")
      .map((line, index) => {
        const [
          lane = "",
          name = "",
          time = "",
          seatStatus = "",
          bookingStatus = "",
          coachName = "",
        ] = line.split("|").map((value) => value.trim())
        const existingClass = initialClasses[index]

        if (!lane && !name && !time && !coachName) return null

        return {
          id: existingClass?.id || crypto.randomUUID(),
          lane: lane || `${index + 1}레인`,
          name: name || "운영 없음",
          time: time || formData.time,
          coachName: coachName || formData.coachName,
          seatStatus,
          bookingStatus,
          isOpen: name !== "운영 없음" && bookingStatus !== "운영 없음",
          isCoachChecked: existingClass?.isCoachChecked || false,
          checkedAt: existingClass?.checkedAt,
        }
      })
      .filter(Boolean) as ScheduleClass[]

    if (parsed.length > 0) return parsed

    return [
      {
        id: initialClasses[0]?.id || crypto.randomUUID(),
        lane: "1레인",
        name: formData.className || "1부",
        time: formData.time,
        coachName: formData.coachName,
        seatStatus: "",
        bookingStatus: "",
        isOpen: true,
        isCoachChecked: initialClasses[0]?.isCoachChecked || false,
        checkedAt: initialClasses[0]?.checkedAt,
      },
    ]
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const classes = parseClassLines()

    console.info("[ScheduleSync] 클래스 시간표 입력값을 저장합니다.", {
      date: formData.date,
      venue: formData.venue,
      classCount: classes.length,
    })

    onSubmit({
      date: formData.date,
      region: formData.region,
      venue: formData.venue,
      address: formData.address,
      className: formData.className,
      time: formData.time,
      coachName: formData.coachName,
      classes,
    })
    setOpen(false)
    if (!initialData) {
      setFormData({
        date: "",
        region: "",
        venue: "",
        address: "",
        className: "",
        time: "",
        coachName: "",
        classLines: "1레인 | 클래스명 | 시간 | 잔여석 | 결제상태 | 담당 선생님",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Calendar className="mr-2 h-4 w-4" />
            새 일정 추가
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Calendar className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                날짜
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="border-input bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                시간
              </Label>
              <Input
                id="time"
                type="text"
                placeholder="예: 15:00~17:00"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
                className="border-input bg-card"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="region" className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                지역
              </Label>
              <Input
                id="region"
                type="text"
                placeholder="예: 김포"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                required
                className="border-input bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue" className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                수영장
              </Label>
              <Input
                id="venue"
                type="text"
                placeholder="예: 아스타스포츠센터"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                required
                className="border-input bg-card"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              주소
            </Label>
            <Input
              id="address"
              type="text"
              placeholder="상세 주소 입력"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="border-input bg-card"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="className" className="flex items-center gap-2 text-muted-foreground">
                클래스
              </Label>
              <Input
                id="className"
                type="text"
                placeholder="예: 수영 특강 일정"
                value={formData.className}
                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                required
                className="border-input bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coachName" className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                코치명
              </Label>
              <Input
                id="coachName"
                type="text"
                placeholder="코치 이름"
                value={formData.coachName}
                onChange={(e) => setFormData({ ...formData, coachName: e.target.value })}
                className="border-input bg-card"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="classLines" className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              클래스 시간표
            </Label>
            <Textarea
              id="classLines"
              placeholder={"예: 1레인 | 평영 A (초급) | 15:00~17:00 | 1자리 남음 | 결제가능 | 김코치\n예: 5레인 | 운영 없음 | 15:00~17:00 |  | 운영 없음 | "}
              value={formData.classLines}
              onChange={(e) => setFormData({ ...formData, classLines: e.target.value })}
              className="min-h-24 border-input bg-card"
            />
            <p className="text-xs text-muted-foreground">
              한 줄에 하나씩 `레인 | 클래스명 | 시간 | 잔여석 | 결제상태 | 담당 선생님` 순서로 입력하세요.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-4 sm:flex sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              취소
            </Button>
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {initialData ? "수정하기" : "추가하기"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
