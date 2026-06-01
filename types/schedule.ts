export interface ScheduleClass {
  id: string
  name: string
  lane: string
  time: string
  coachName: string
  seatStatus: string
  bookingStatus: string
  isOpen: boolean
  isCoachChecked: boolean
  checkedAt?: string
}

export interface Schedule {
  id: string
  date: string
  region: string
  venue: string
  address: string
  className: string
  time: string
  coachName: string
  classes: ScheduleClass[]
  isConfirmed: boolean
  createdAt: string
  updatedAt?: string
}

export interface ScheduleChange {
  id: string
  scheduleId: string
  previousCoach: string
  newCoach: string
  changedAt: string
  notified: boolean
}
