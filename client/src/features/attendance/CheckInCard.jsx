import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiLogIn, FiLogOut, FiClock, FiCoffee, FiPlay } from 'react-icons/fi'
import { attendanceApi } from '@/api/services'
import { Card, Button, Badge } from '@/components/ui'

const fmtDur = (secs) => {
  const s = Math.max(0, Math.floor(secs || 0))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export const ATTENDANCE_TODAY_KEY = ['attendance-today']

export function readTimerAnchors(rec) {
  if (!rec || !rec.checkIn) {
    return { checkedIn: false, checkInAt: null, checkOutAt: null, onBreak: false, checkInEpochMs: null, closedBreakSecs: 0, breakStartedAtMs: null, finalWorkSecs: null }
  }
  const breaks = Array.isArray(rec.breaks) ? rec.breaks : []
  const closedFromSessions = breaks.reduce((s, b) => s + (b && b.end ? (b.seconds || 0) : 0), 0)
  const persistedTotal = typeof rec.breakSecs === 'number' ? rec.breakSecs : (rec.breakMins || 0) * 60
  const closedBreakSecs = breaks.length ? closedFromSessions : persistedTotal

  const openSession = [...breaks].reverse().find((b) => b && b.start && !b.end)
  let breakStartedAtMs = null
  if (openSession) {
    const t = new Date(openSession.start).getTime()
    if (!Number.isNaN(t)) breakStartedAtMs = t
  } else if (rec.onBreak && rec.breakStartedAt) {
    const t = new Date(rec.breakStartedAt).getTime()
    if (!Number.isNaN(t)) breakStartedAtMs = t
  }

  return {
    checkedIn: true,
    checkInAt: rec.checkIn,
    checkOutAt: rec.checkOut || null,
    onBreak: Boolean(rec.onBreak) && !rec.checkOut,
    checkInEpochMs: rec.checkInSeconds ? rec.checkInSeconds * 1000 : (rec.checkInAt ? new Date(rec.checkInAt).getTime() : null),
    closedBreakSecs,
    breakStartedAtMs: rec.checkOut ? null : breakStartedAtMs,
    finalWorkSecs: rec.checkOut ? (rec.durationSecs || 0) : null,
  }
}

export function useAttendanceSession() {
  const qc = useQueryClient()

  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  const { data: record } = useQuery({
    queryKey: ATTENDANCE_TODAY_KEY,
    queryFn: () => attendanceApi.today(),
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    staleTime: 0,
  })

  const refreshLists = () => {
    qc.invalidateQueries({ queryKey: ['attendance-me'] })
    qc.invalidateQueries({ queryKey: ['attendance-calendar'] })
    qc.invalidateQueries({ queryKey: ['attendance-stats'] })
    qc.invalidateQueries({ queryKey: ['attendance-my-summary'] })
  }

  const anchors = readTimerAnchors(record)

  const patchRecord = (patch) => {
    qc.setQueryData(ATTENDANCE_TODAY_KEY, (prev) => ({ ...(prev || {}), ...(patch || {}) }))
  }

  const checkInMut = useMutation({
    mutationFn: () => attendanceApi.checkIn({ timezone }),
    onSuccess: (res) => {
      patchRecord(res)
      toast.success(`Checked in at ${res.checkIn}`); refreshLists()
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Check-in failed'),
  })

  const checkOutMut = useMutation({
    mutationFn: () => attendanceApi.checkOut(),
    onSuccess: (res) => {
      patchRecord(res)
      toast.success(`Checked out at ${res.checkOut}`); refreshLists()
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Check-out failed'),
  })

  const breakMut = useMutation({
    mutationFn: () => attendanceApi.toggleBreak({ onBreak: !anchors.onBreak }),
    onSuccess: (res) => {
      const nowOnBreak = !anchors.onBreak
      patchRecord(res)
      toast(nowOnBreak ? 'Break started' : 'Break ended', { icon: '\u2615' })
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Could not update break'),
  })

  return { record, timezone, anchors, checkInMut, checkOutMut, breakMut }
}

export function CheckInButton(props) {
  const { anchors, checkInMut, checkOutMut } = useAttendanceSession()
  const { checkedIn, checkOutAt } = anchors

  if (checkedIn && checkOutAt) {
    return <Badge tone="success">Shift Complete ✓</Badge>
  }

  if (checkedIn) {
    return (
      <Button icon={FiLogOut} glow loading={checkOutMut.isPending} onClick={() => checkOutMut.mutate()} {...props}>
        Check Out
      </Button>
    )
  }

  return (
    <Button icon={FiLogIn} glow loading={checkInMut.isPending} onClick={() => checkInMut.mutate()} {...props}>
      Check In
    </Button>
  )
}

export function CheckInCard() {
  const [clock, setClock] = useState(() => new Date())
  const { timezone, anchors, checkInMut, checkOutMut, breakMut } = useAttendanceSession()

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const {
    checkedIn, checkInAt, checkOutAt, onBreak,
    checkInEpochMs, closedBreakSecs, breakStartedAtMs, finalWorkSecs,
  } = anchors

  const nowMs = clock.getTime()
  const breakSecs = closedBreakSecs + (breakStartedAtMs ? Math.max(0, Math.floor((nowMs - breakStartedAtMs) / 1000)) : 0)
  const workSecs = finalWorkSecs != null
    ? finalWorkSecs
    : (checkInEpochMs ? Math.max(0, Math.floor((nowMs - checkInEpochMs) / 1000) - breakSecs) : 0)

  const dateLabel = clock.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const timeLabel = clock.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  })

  return (
    <Card className="bg-gradient-to-r from-primary to-accent text-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-none items-center justify-center rounded-2xl bg-white/20">
            <FiClock className="h-8 w-8" />
          </div>
          <div>
            {}
            <p className="text-sm text-white/80">{dateLabel}</p>
            <p className="text-3xl font-bold tabular-nums">{timeLabel}</p>
            <p className="text-xs text-white/70">{timezone}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/80">
              {checkInAt && <span className="flex items-center gap-1"><FiLogIn className="h-3 w-3" />In {checkInAt}</span>}
              {checkOutAt && <span className="flex items-center gap-1"><FiLogOut className="h-3 w-3" />Out {checkOutAt}</span>}
              {checkedIn && (
                <>
                  <span className="flex items-center gap-1 tabular-nums"><FiClock className="h-3 w-3" />Worked {fmtDur(workSecs)}</span>
                  <span className="flex items-center gap-1 tabular-nums"><FiCoffee className="h-3 w-3" />Break {fmtDur(breakSecs)}</span>
                </>
              )}
              {onBreak && <Badge tone="warning" className="text-warning">On Break</Badge>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!checkedIn ? (
            <Button variant="ghost" className="bg-white text-primary" icon={FiLogIn} loading={checkInMut.isPending} onClick={() => checkInMut.mutate()}>
              Check In
            </Button>
          ) : checkOutAt ? (
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
              <Badge tone="success" className="bg-white text-success">Shift Complete ✓</Badge>
            </motion.div>
          ) : (
            <>
              <Button variant="ghost" className="bg-white/20 text-white hover:bg-white/30" icon={onBreak ? FiPlay : FiCoffee} loading={breakMut.isPending} onClick={() => breakMut.mutate()}>
                {onBreak ? 'Resume' : 'Break'}
              </Button>
              <Button variant="ghost" className="bg-white text-danger" icon={FiLogOut} loading={checkOutMut.isPending} onClick={() => checkOutMut.mutate()}>
                Check Out
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
