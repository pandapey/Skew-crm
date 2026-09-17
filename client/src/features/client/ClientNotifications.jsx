import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { FiBell, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { clientService } from './clientService'
import { NOTIFICATION_ICONS, NOTIFICATION_TONES, NOTIFICATION_ROUTES, categorizeNotification } from './ClientNotificationBell'
import { PageHeader, Card, Loader, EmptyState, Button } from '@/components/ui'
import { fmtTimeAgo } from './constants'
import { cn } from '@/utils'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
  { key: 'meeting', label: 'Meetings' },
  { key: 'task', label: 'Tasks' },
  { key: 'project', label: 'Projects' },
  { key: 'document', label: 'Documents' },
  { key: 'billing', label: 'Billing' },
]

export default function ClientNotifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['client-notifications'],
    queryFn: () => clientService.getNotifications(user),
  })

  const refresh = () =>
    qc.invalidateQueries({ queryKey: ['client-notifications'], refetchType: 'active' })

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
    onError: () => {
      refresh()
      toast.error('Could not mark that notification as read')
    },
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

  const filtered = useMemo(() => {
    if (filter === 'all') return list
    if (filter === 'unread') return list.filter((n) => !n.read)
    if (filter === 'read') return list.filter((n) => n.read)
    return list.filter((n) => categorizeNotification(n) === filter)
  }, [list, filter])

  const unreadCount = useMemo(() => list.filter((n) => !n.read).length, [list])

  const openItem = (n) => {
    if (!n.read && n.id) markOne.mutate(n.id)
    navigate(NOTIFICATION_ROUTES[n.icon] || '/client')
  }

  if (isLoading) return <Loader label="Loading notifications…" />

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`${list.length} total · ${unreadCount} unread`}
        actions={unreadCount > 0 ? (
          <Button icon={FiCheck} onClick={() => markAll.mutate()} loading={markAll.isPending}>
            Mark all as read
          </Button>
        ) : null}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
              filter === f.key
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-app text-muted hover:bg-black/5 dark:hover:bg-white/10',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        {list.length === 0 ? (
          <EmptyState title="No New Notifications" description="Updates about your projects, invoices, meetings and documents will appear here." />
        ) : filtered.length === 0 ? (
          <EmptyState title="Nothing here" description="No notifications match this filter yet." />
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => {
              const Icon = NOTIFICATION_ICONS[n.icon] || FiBell
              const tone = NOTIFICATION_TONES[n.icon] || 'bg-primary/10 text-primary'
              return (
                <div
                  key={n.id}
                  className={cn(
                    'flex flex-wrap items-start gap-3 rounded-xl border border-app p-3 transition',
                    !n.read && 'border-primary/30 bg-primary/[0.03]',
                  )}
                >
                  <span className={cn('flex h-10 w-10 flex-none items-center justify-center rounded-xl', tone)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <button onClick={() => openItem(n)} className="min-w-0 flex-1 text-left">
                    <p className={cn('truncate text-sm', n.read ? 'font-normal text-muted' : 'font-semibold')}>{n.title}</p>
                    <p className="text-xs text-muted">{n.body}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{fmtTimeAgo(n.at)}</p>
                  </button>
                  {!n.read && (
                    <button
                      onClick={() => markOne.mutate(n.id)}
                      disabled={markOne.isPending}
                      className="flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/20 disabled:opacity-50"
                    >
                      <FiCheck /> Mark as read
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
