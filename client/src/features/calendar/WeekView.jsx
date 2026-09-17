import dayjs from 'dayjs'
import TimeGrid from './TimeGrid'

export default function WeekView({ current, occurrences, today, now, ...handlers }) {

  const start = current.startOf('week')
  const days = Array.from({ length: 7 }, (_, i) => start.add(i, 'day'))
  return (
    <TimeGrid
      days={days}
      occurrences={occurrences}
      today={today}
      now={now}
      minWidth={760}
      {...handlers}
    />
  )
}
