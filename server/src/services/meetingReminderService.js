import { CalendarEvent } from '../models/calendarModels.js'
import { ClientNotification } from '../models/clientModels.js'
import { emitToClient } from '../realtime/index.js'

const ONE_HOUR_MS = 60 * 60 * 1000

const formatStart = (start) => {
  try {
    return new Date(start).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return new Date(start).toISOString()
  }
}

export async function sendMeetingReminders() {
  const now = new Date()
  const horizon = new Date(now.getTime() + ONE_HOUR_MS)

  const due = await CalendarEvent.find({
    type: 'meeting',
    clientId: { $ne: null },
    start: { $gt: now, $lte: horizon },
    reminderSentAt: null,
    meetingStatus: { $nin: ['Cancelled', 'Rejected'] },
  })
    .select('_id title start clientId location')
    .lean()

  let sent = 0

  for (const ev of due) {
    const claim = await CalendarEvent.updateOne(
      { _id: ev._id, reminderSentAt: null },
      { $set: { reminderSentAt: new Date() } }
    )
    if (!(claim?.modifiedCount > 0)) continue

    try {
      const doc = await ClientNotification.create({
        clientId: ev.clientId,
        title: `Meeting in 1 hour: ${ev.title}`,
        body: `Starts at ${formatStart(ev.start)}${ev.location ? ` · ${ev.location}` : ''}.`,
        icon: 'meeting',
        read: false,
      })
      emitToClient(ev.clientId, 'client:notification', { action: 'created', id: String(doc._id) })
      sent += 1
    } catch (err) {
      await CalendarEvent.updateOne({ _id: ev._id }, { $set: { reminderSentAt: null } }).catch(() => {})
      console.error('[meeting-reminders] failed for event', String(ev._id), err?.message)
    }
  }

  return sent
}
