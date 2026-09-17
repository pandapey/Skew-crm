import { Holiday } from '../models/attendanceModels.js'

export const meetingDayKey = (start) => {
  const raw = String(start || '')
  return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : ''
}

export const meetingDateRejection = async (start) => {
  const key = meetingDayKey(start)
  if (!key) return ''
  if (new Date(`${key}T00:00:00`).getDay() === 0) return 'Meetings cannot be scheduled on a Sunday.'
  const holiday = await Holiday.findOne({ date: key }).select('name').lean()
  if (holiday) return `Meetings cannot be scheduled on a company holiday (${holiday.name}).`
  return ''
}

export const MEETING_DEFAULT_DURATION_MINUTES = 60

export const deriveMeetingEnd = (start) => {
  const s = new Date(start)
  if (Number.isNaN(s.getTime())) return null
  return new Date(s.getTime() + MEETING_DEFAULT_DURATION_MINUTES * 60 * 1000)
}
