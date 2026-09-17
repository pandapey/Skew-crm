import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import { calendarApi } from '@/api/services'

dayjs.extend(utc)
dayjs.extend(timezone)

export function useTodayEvents() {
  const from = dayjs().tz('Asia/Kolkata').startOf('day').toISOString()
  const to = dayjs().tz('Asia/Kolkata').endOf('day').toISOString()
  return useQuery({
    queryKey: ['calendar', 'range', 'today'],
    queryFn: () => calendarApi.range(from, to),
    staleTime: 60_000,
  })
}
