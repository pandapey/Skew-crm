export const SUNDAY = 0

export function parseDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value !== 'string') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!m) {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export function isSunday(value) {
  const d = parseDate(value)
  return d ? d.getDay() === SUNDAY : false
}

export function toDateKey(value) {
  const d = parseDate(value)
  if (!d) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function countWorkingDays(from, to, holidays = new Set()) {
  const a = parseDate(from)
  const b = parseDate(to)
  if (!a || !b) return 0
  a.setHours(0, 0, 0, 0)
  b.setHours(0, 0, 0, 0)
  if (b < a) return 0
  let days = 0
  const cursor = new Date(a)
  while (cursor <= b) {
    const isHoliday = holidays instanceof Set && holidays.has(toDateKey(cursor))
    if (cursor.getDay() !== SUNDAY && !isHoliday) days += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export function countSundays(from, to) {
  const a = parseDate(from)
  const b = parseDate(to)
  if (!a || !b) return 0
  a.setHours(0, 0, 0, 0)
  b.setHours(0, 0, 0, 0)
  if (b < a) return 0
  let n = 0
  const cursor = new Date(a)
  while (cursor <= b) {
    if (cursor.getDay() === SUNDAY) n += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return n
}

export const HALF_DAY_SESSIONS = ['First Half', 'Second Half']
export const HALF_DAY_VALUE = 0.5

export const MAX_LEAVE_DAYS_PER_REQUEST = 5

export const CAP_EXEMPT_LEAVE_TYPES = ['Maternity Leave', 'Paternity Leave']

export function isCapExemptLeaveType(type) {
  const t = String(type || '').trim().toLowerCase()
  return CAP_EXEMPT_LEAVE_TYPES.some((x) => x.toLowerCase() === t)
}

export function maxDaysForRequest(type, availableBalance) {
  if (!isCapExemptLeaveType(type)) return MAX_LEAVE_DAYS_PER_REQUEST
  const bal = Number(availableBalance)
  return Number.isFinite(bal) && bal > 0 ? bal : 0
}

export const HOURLY_PERMISSION_MONTHLY_HOURS = 3

export const HOURLY_PERMISSION_STEP_HOURS = 0.5

export function monthKeyOf(value) {
  const d = parseDate(value)
  if (!d) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthBounds(key) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(key || '').trim())
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const last = new Date(year, month, 0).getDate()
  return {
    start: `${m[1]}-${m[2]}-01`,
    end: `${m[1]}-${m[2]}-${String(last).padStart(2, '0')}`,
  }
}

export function monthExpiryInstant(value = new Date()) {
  const d = parseDate(value) || new Date()

  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function monthEndDateKey(value = new Date()) {
  return toDateKey(monthExpiryInstant(value))
}

export function isMonthBalanceExpired(value, at = new Date()) {
  const expiry = monthExpiryInstant(value)
  const now = at instanceof Date ? at : new Date(at)
  return now.getTime() > expiry.getTime()
}

export function resolveLeaveDuration({ from, to, halfDay = false, halfDaySession = null, holidays = new Set() }) {
  if (!from || !to) return { days: 0, error: 'Both a start and end date are required' }
  if (isSunday(from) || isSunday(to)) {
    return { days: 0, error: 'Sundays are company holidays and cannot be selected as leave dates' }
  }

  if (halfDay) {
    if (String(from) !== String(to)) {
      return { days: 0, error: 'A half-day leave must start and end on the same date' }
    }
    if (!HALF_DAY_SESSIONS.includes(halfDaySession)) {
      return { days: 0, error: 'Select First Half or Second Half for a half-day leave' }
    }
    return { days: HALF_DAY_VALUE, sundaysExcluded: 0, error: null }
  }

  const days = countWorkingDays(from, to, holidays)
  if (days < 1) {
    return { days: 0, error: 'The selected range contains no working days, after excluding Sundays and Company Holidays' }
  }
  return { days, sundaysExcluded: countSundays(from, to), error: null }
}
