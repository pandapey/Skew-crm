import { User } from '../models/User.js'
import { Notification, NotificationSettings } from '../models/notificationModels.js'

export async function notifyUsersByName(names, payload) {
  const unique = [...new Set((names || []).filter(Boolean))]
  if (!unique.length) return []
  const users = await User.find({ name: { $in: unique }, role: { $ne: 'Client' } })
    .select('email name')
    .lean()
  if (!users.length) return []
  return deliver(users.map((u) => u.email), payload)
}

export async function notifyUsersByEmail(emails, payload) {
  const unique = [...new Set((emails || []).filter(Boolean))]
  if (!unique.length) return []
  return deliver(unique, payload)
}

async function deliver(emails, payload) {
  const { type = 'announcement' } = payload
  const settings = await NotificationSettings.find({ user: { $in: emails } }).lean()
  const muted = new Set(
    settings.filter((s) => s[type] === false).map((s) => s.user)
  )
  const targets = emails.filter((email) => !muted.has(email))
  if (!targets.length) return []
  return Notification.insertMany(targets.map((email) => ({ ...payload, recipient: email })))
}
