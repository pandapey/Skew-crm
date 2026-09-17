import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Modal, Button, Input } from '@/components/ui'
import { formatDate } from '@/utils'

function toLocalInputValue(value) {
  const d = value ? new Date(value) : new Date()
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const fmtDateTime = (v) => (v ? formatDate(v, 'DD MMM YYYY, hh:mm A') : '—')

export function MeetingRescheduleModal({ meeting, onClose, onSaved, submitFn, successMessage }) {
  const [start, setStart] = useState(toLocalInputValue(meeting?.start))

  const rescheduleMut = useMutation({
    mutationFn: () => submitFn(meeting.id || meeting._id, start),
    onSuccess: () => {
      toast.success(successMessage || 'Meeting rescheduled')
      onSaved()
      onClose()
    },
    onError: (err) => toast.error(err?.response?.data?.message || err?.message || 'Could not reschedule'),
  })

  const submit = (e) => {
    e.preventDefault()
    if (!start) { toast.error('Pick a new date and time'); return }
    rescheduleMut.mutate()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Reschedule meeting"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={rescheduleMut.isPending}>Save new time</Button>
        </>
      )}
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted">
          Currently <span className="font-medium text-app">{fmtDateTime(meeting?.start)}</span>.
        </p>
        <Input label="New date & time" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
        <p className="text-xs text-muted">
          Proposing a new time returns the request to Pending so the other side can confirm it.
        </p>
      </form>
    </Modal>
  )
}
