export interface NotionAssignmentRecord {
  pageId: string
  classTitle: string
  date: string
  venue: string
  coachName: string
  isChecked: boolean
  isCancelled: boolean
  cancelReason: string
}

export interface NotionAssignmentInput {
  classTitle: string
  date: string
  venue: string
  address?: string
  coachName: string
  isChecked: boolean
  isCancelled: boolean
  cancelReason?: string
}
