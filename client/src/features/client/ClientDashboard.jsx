import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FiBriefcase, FiCalendar, FiDollarSign, FiArrowRight,
  FiCheckCircle, FiAlertCircle,
} from 'react-icons/fi'
import { useAuth } from '@/hooks/useAuth'
import { clientService } from './clientService'
import { cn, formatCurrency } from '@/utils'
import { Card, CardHeader, StatCard, Badge, ProgressBar, Avatar, Loader, EmptyState } from '@/components/ui'
import { GlassWidget } from '@/components/glass'
import { TIMELINE_STAGES, PROJECT_STATUS_TONE, fmtDate, stageState, summarizeBilling } from './constants'

const fade = (d = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: d, ease: [0.22, 1, 0.36, 1] },
})

export default function ClientDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: profile, isLoading: lp } = useQuery({ queryKey: ['client-profile'], queryFn: () => clientService.getProfile(user) })
  const { data: projects = [], isLoading: lj } = useQuery({ queryKey: ['client-projects'], queryFn: () => clientService.getProjects(user) })
  const { data: team = [], isLoading: lt } = useQuery({ queryKey: ['client-team'], queryFn: () => clientService.getTeam(user) })
  const { data: billing, isLoading: lpay } = useQuery({ queryKey: ['client-payments'], queryFn: () => clientService.getPayments(user) })
  const payments = billing?.rows || []

  if (lp || lj) return <Loader label="Loading your portal…" />

  const active = projects.filter((p) => p.status !== 'Completed' && p.status !== 'On Hold')
  const nextMilestone = projects
    .flatMap((p) => p.timeline.filter((s) => s.status === 'In Progress').map((s) => ({ ...s, projectName: p.name, projectId: p.id })))
    .slice(0, 1)[0]

  const { paid: totalPaid, balance } = billing.summary ?? summarizeBilling(billing)
  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0)
  const lastUpdated = payments[0]?.date ? fmtDate(payments[0].date) : fmtDate(new Date().toISOString())

  return (
    <div className="space-y-4">
      {}
      <GlassWidget className="!p-0">
        <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-primary via-primary to-accent p-6 text-white shadow-glow-primary">
          <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-white/80">Welcome back,</p>
              <h2 className="text-2xl font-bold">{profile?.contactPerson}</h2>
              <p className="mt-1 text-white/80">{profile?.company} · {profile?.plan} Plan</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate('/client/projects')}
                className="rounded-xl bg-white/10 px-3 py-2 text-center transition hover:bg-white/20"
              >
                <p className="text-xs text-white/70">Active Projects</p>
                <p className="text-lg font-bold">{active.length}</p>
              </button>
              <button
                type="button"
                disabled={!nextMilestone}
                onClick={() => navigate(nextMilestone?.projectId ? `/client/projects/${nextMilestone.projectId}` : '/client/projects')}
                className="rounded-xl bg-white/10 px-3 py-2 text-center transition enabled:hover:bg-white/20 disabled:cursor-default"
              >
                <p className="text-xs text-white/70">Next Milestone</p>
                <p className="text-sm font-bold">{nextMilestone ? nextMilestone.name : '—'}</p>
              </button>
            </div>
          </div>
          <p className="relative mt-3 text-xs text-white/70">Last updated {lastUpdated}</p>
        </div>
      </GlassWidget>

      {}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active Projects" value={active.length} icon={FiBriefcase} tone="primary" onClick={() => navigate('/client/projects')} />
        <StatCard label="Total Projects" value={projects.length} icon={FiCalendar} tone="accent" onClick={() => navigate('/client/projects')} />
        <StatCard label="Amount Paid" value={totalPaid} format={formatCurrency} icon={FiDollarSign} tone="success" onClick={() => navigate('/client/billing')} />
        <StatCard label="Outstanding" value={balance} format={formatCurrency} icon={FiAlertCircle} tone={balance > 0 ? 'warning' : 'success'} onClick={() => navigate('/client/billing')} />
      </div>

      {}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Your Projects</h3>
          <button onClick={() => navigate('/client/projects')} className="flex items-center gap-1 text-sm text-primary hover:underline">View all <FiArrowRight /></button>
        </div>
        {projects.length === 0 ? (
          <EmptyState title="No projects yet" description="Your assigned projects will appear here." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p, i) => (
              <motion.div key={p.id} {...fade(i * 0.04)}>
                <Card className="h-full cursor-pointer transition hover:border-primary/50" onClick={() => navigate(`/client/projects/${p.id}`)}>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="text-xs text-muted">{p.code} · {p.projectManager}</p>
                    </div>
                    <Badge tone={PROJECT_STATUS_TONE[p.status]}>{p.status}</Badge>
                  </div>
                  <div className="mb-2 flex items-center justify-between text-xs text-muted">
                    <span>{fmtDate(p.startDate)} → {fmtDate(p.deliveryDate)}</span>
                    <Badge>{p.priority}</Badge>
                  </div>
                  <ProgressBar value={p.progress} showLabel />
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {}
        <Card className="lg:col-span-2">
          <CardHeader title="Project Progress" subtitle="Across your active projects" />
          {active.length === 0 ? (
            <EmptyState title="Nothing in progress" description="Completed / on-hold projects are hidden here." />
          ) : (
            <div className="space-y-4">
              {active.map((p) => (
                <div key={p.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/client/projects/${p.id}`)}
                    className="mb-2 text-sm font-medium hover:text-primary hover:underline"
                  >
                    {p.name}
                  </button>
                  <div className="flex items-center">
                    {TIMELINE_STAGES.map((stage, idx) => {
                      const st = p.timeline.find((s) => s.name === stage)
                      const state = stageState(st?.status)
                      return (
                        <div key={stage} className="flex flex-1 items-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className={cn(
                              'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold',
                              state === 'done' ? 'bg-success text-white' : state === 'active' ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-black/10 text-muted dark:bg-white/10',
                            )}>
                              {state === 'done' ? <FiCheckCircle className="h-4 w-4" /> : idx + 1}
                            </div>
                            <span className="hidden text-[9px] text-muted sm:block">{stage}</span>
                          </div>
                          {idx < TIMELINE_STAGES.length - 1 && (
                            <div className={cn('h-1 flex-1', st && p.timeline[idx + 1] && p.timeline[idx + 1].status === 'Completed' ? 'bg-success' : 'bg-black/10 dark:bg-white/10')} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {}
        <Card>
          <CardHeader title="Billing Summary" action={<FiDollarSign className="text-success" />} />
          {lpay ? <Loader /> : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm"><span className="text-muted">Total Budget</span><span className="font-semibold">{formatCurrency(totalBudget)}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-muted">Paid</span><span className="font-semibold text-success">{formatCurrency(totalPaid)}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-muted">Outstanding</span><span className="font-semibold text-warning">{formatCurrency(balance)}</span></div>
              <button onClick={() => navigate('/client/billing')} className="mt-1 w-full rounded-xl bg-primary/10 py-2 text-sm font-medium text-primary transition hover:bg-primary/20">View billing & invoices</button>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Your Team" subtitle="People working on your projects" />
        {lt ? <Loader /> : team.length === 0 ? (
          <EmptyState title="No team assigned" />
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {team.slice(0, 6).map((m) => (
              <div key={`${m.name}|${m.projectId || ''}|${m.roleInProject || ''}`} className="flex items-center gap-3 rounded-xl border border-app p-3">
                <Avatar name={m.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted">{m.roleInProject} · {m.department}</p>
                </div>
                <Badge tone={m.availability === 'Available' ? 'success' : 'warning'}>{m.availability}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
