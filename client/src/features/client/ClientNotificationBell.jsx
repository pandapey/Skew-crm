import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiBell, FiZap, FiFileText, FiDollarSign, FiCalendar, FiMessageSquare, FiUpload, FiCheckCircle, FiRefreshCw, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { clientService } from './clientService'
import { fmtTimeAgo } from './constants'
import { cn } from '@/utils'

export const NOTIFICATION_ICONS = {
  invoice: FiFileText, payment: FiDollarSign, meeting: FiCalendar,
  comment: FiMessageSquare, file: FiUpload, delivery: FiCheckCircle, update: FiRefreshCw,
  document: FiFileText, message: FiMessageSquare,
}
export const NOTIFICATION_TONES = {
  invoice: 'bg-primary/10 text-primary', payment: 'bg-warning/10 text-warning',
  meeting: 'bg-accent/10 text-accent', comment: 'bg-primary/10 text-primary',
  file: 'bg-success/10 text-success', delivery: 'bg-success/10 text-success',
  update: 'bg-primary/10 text-primary',
  document: 'bg-success/10 text-success', message: 'bg-primary/10 text-primary',
}

export const NOTIFICATION_CATEGORIES = {
  meeting: 'meeting',
  invoice: 'billing',
  payment: 'billing',
  document: 'document',
  file: 'document',
  comment: 'project',
  message: 'project',
  update: 'task',
  delivery: 'task',
}
export const categorizeNotification = (n) => NOTIFICATION_CATEGORIES[n?.icon] || 'project'

export const NOTIFICATION_ROUTES = {
  invoice: '/client/billing',
  payment: '/client/billing',
  meeting: '/client/meetings',
  comment: '/client/projects',
  file: '/client/projects',
  delivery: '/client/projects',
  update: '/client/projects',
  document: '/client/projects',
  message: '/client/projects',
}

export function ClientNotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const { data: list = [] } = useQuery({
    queryKey: ['client-notifications'],
    queryFn: () => clientService.getNotifications(user),
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['client-notifications'], refetchType: 'active' })

  const seedAllRead = () =>
    qc.setQueryData(['client-notifications'], (old) =>
      Array.isArray(old) ? old.map((n) => ({ ...n, read: true })) : old
    )
  const seedOneRead = (id) =>
    qc.setQueryData(['client-notifications'], (old) =>
      Array.isArray(old) ? old.map((n) => (n.id === id ? { ...n, read: true } : n)) : old
    )

  const markOne = useMutation({
    mutationFn: (id) => clientService.markNotificationRead(id),
    onMutate: (id) => seedOneRead(id),
    onSuccess: refresh,
    onError: () => refresh(),
  })

  const markAll = useMutation({
    mutationFn: () => clientService.markAllNotificationsRead(),
    onMutate: seedAllRead,
    onSuccess: (res) => {
      refresh()
      toast.success(res?.updated ? `Marked ${res.updated} as read` : 'All caught up')
    },
    onError: () => {
      refresh()
      toast.error('Could not mark notifications as read')
    },
  })

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const unread = list.filter((n) => !n.read)
  const unreadCount = unread.length
  const recent = unread.slice(0, 6)

  const openItem = (n) => {
    setOpen(false)

    if (!n.read && n.id) markOne.mutate(n.id)

    navigate(NOTIFICATION_ROUTES[n.icon] || '/client')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn('relative rounded-lg p-2 transition hover:bg-black/5 dark:hover:bg-white/10', open && 'bg-black/5 dark:bg-white/10')}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <FiBell />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="glass-strong absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-card shadow-floating">
          <div className="flex items-center justify-between border-b border-app px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary"><FiZap className="h-3.5 w-3.5" /></span>
              <p className="text-sm font-semibold">Notifications</p>
              {unreadCount > 0 && <span className="rounded-full bg-danger/10 px-2 text-xs font-semibold text-danger">{unreadCount} new</span>}
            </div>
            {}
            {unreadCount > 0 && (
              <button
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary transition hover:bg-primary/10 disabled:opacity-50"
              >
                <FiCheck className="h-3.5 w-3.5" /> Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">No New Notifications</p>
            ) : (
              recent.map((n) => {
                const Icon = NOTIFICATION_ICONS[n.icon] || FiBell
                const tone = NOTIFICATION_TONES[n.icon] || 'bg-primary/10 text-primary'
                return (
                  <button key={n.id} onClick={() => openItem(n)} className="flex w-full items-start gap-3 border-b border-app px-4 py-3 text-left transition last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                    <div className={cn('flex h-9 w-9 flex-none items-center justify-center rounded-xl', tone)}><Icon className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-sm', n.read ? 'font-normal text-muted' : 'font-semibold')}>{n.title}</p>
                      <p className="truncate text-xs text-muted">{n.body}</p>
                      <p className="mt-0.5 text-[11px] text-muted">{fmtTimeAgo(n.at)}</p>
                    </div>
                    {!n.read && <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-primary" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
