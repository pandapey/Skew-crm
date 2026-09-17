import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiCheckCircle, FiClock, FiCircle } from 'react-icons/fi'
import { useAuth } from '@/hooks/useAuth'
import { clientService } from './clientService'
import { cn } from '@/utils'
import { PageHeader, Card, CardHeader, Badge, ProgressBar, Avatar, Loader, EmptyState, Button } from '@/components/ui'
import { PROJECT_STATUS_TONE, fmtDate, TIMELINE_STAGES, stageState, stageTone } from './constants'
import ProjectCommunication from './ProjectCommunication'
import ProjectProgressDashboard from './ProjectProgressDashboard'
import ProjectTaskHistory from './ProjectTaskHistory'
import ProjectDocuments from './ProjectDocuments'

const TABS = ['Overview', 'Task History', 'Documents', 'Team', 'Project Timeline', 'Messages']

export default function ClientProjectDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Overview')

  const { data: p, isLoading } = useQuery({ queryKey: ['client-project', id], queryFn: () => clientService.getProject(user, id) })

  if (isLoading) return <Loader label="Loading project…" />
  if (!p) return <EmptyState title="Project not found" description="It may have been reassigned." />

  return (
    <div>
      <Button variant="ghost" icon={FiArrowLeft} onClick={() => navigate('/client/projects')} className="mb-3">Back to Projects</Button>
      <PageHeader
        title={p.name}
        subtitle={`Project ID: ${p.code || p.projectId || '—'} · ${p.projectManager}`}
        actions={<Badge tone={PROJECT_STATUS_TONE[p.status]}>{p.status}</Badge>}
      />

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium transition ${tab === t ? 'bg-primary text-white' : 'bg-black/5 text-muted hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Progress" />
            <div className="mb-4 flex items-center gap-4">
              <div className="text-4xl font-bold">{p.progress}%</div>
              <div className="flex-1"><ProgressBar value={p.progress} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><p className="text-muted">Priority</p><Badge>{p.priority}</Badge></div>
              <div><p className="text-muted">Start</p><p className="font-medium">{fmtDate(p.startDate)}</p></div>
              <div><p className="text-muted">Delivery</p><p className="font-medium">{fmtDate(p.deliveryDate)}</p></div>
              <div><p className="text-muted">Manager</p><p className="font-medium">{p.projectManager}</p></div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Quick facts" />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted">Status</span><Badge tone={PROJECT_STATUS_TONE[p.status]}>{p.status}</Badge></div>
              <div className="flex justify-between"><span className="text-muted">Project Manager</span><span className="font-medium">{p.projectManager || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted">Budget</span><span className="font-medium">₹{p.budget?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted">Team Members</span><span className="font-medium">{p.team?.length || 0}</span></div>
            </div>
          </Card>
          <div className="lg:col-span-3">
            <ProjectProgressDashboard projectId={id} />
          </div>
        </div>
      )}

      {tab === 'Project Timeline' && (
        <Card>
          <CardHeader title="Project Timeline" subtitle="Six-stage delivery roadmap" />
          <div className="relative space-y-1 pl-2">
            {TIMELINE_STAGES.map((stage, idx) => {
              const st = p.timeline.find((s) => s.name === stage)
              const state = stageState(st?.status)
              return (
                <div key={stage} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', state === 'done' ? 'bg-success text-white' : state === 'active' ? 'bg-primary text-white ring-4 ring-primary/15' : 'bg-black/10 text-muted dark:bg-white/10')}>
                      {state === 'done' ? <FiCheckCircle /> : state === 'active' ? <FiClock /> : <FiCircle />}
                    </div>
                    {idx < TIMELINE_STAGES.length - 1 && <div className={cn('w-0.5 flex-1', st && p.timeline[idx + 1]?.status === 'Completed' ? 'bg-success' : 'bg-black/10 dark:bg-white/10')} />}
                  </div>
                  <div className="flex-1 pb-5">
                    <div className="flex items-center justify-between">
                      <p className={cn('font-medium', state === 'todo' && 'text-muted')}>{stage}</p>
                      <Badge tone={stageTone(st?.status)}>{st?.status}</Badge>
                    </div>
                    <p className="text-xs text-muted">{st?.date ? `Completed: ${fmtDate(st.date)}` : 'In progress / scheduled'}</p>
                    {st?.notes && <p className="mt-1 text-sm text-muted">{st.notes}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {tab === 'Task History' && <ProjectTaskHistory projectId={id} />}

      {tab === 'Team' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {p.team?.map((m) => (
            <Card key={`${m.name}|${m.roleInProject || ''}`}>
              <div className="flex items-center gap-3">
                <Avatar name={m.name} size={44} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{m.name}</p>
                  <p className="text-xs text-muted">{m.position}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted">{m.roleInProject}</span>
                <Badge tone={m.availability === 'Available' ? 'success' : 'warning'}>{m.availability}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted">{m.department}</p>
            </Card>
          ))}
        </div>
      )}

      {tab === 'Messages' && <ProjectCommunication projectId={id} viewerName={user?.name} title="Messages" />}

      {tab === 'Documents' && <ProjectDocuments projectId={id} title="Documents" />}
    </div>
  )
}
