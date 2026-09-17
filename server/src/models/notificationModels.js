import mongoose from 'mongoose'

const { Schema, model } = mongoose
const opts = { timestamps: true }

const notificationSchema = new Schema({
  recipient: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['task', 'leave', 'attendance', 'meeting', 'project', 'announcement', 'admin', 'chat'],
    default: 'announcement', index: true,
  },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  sender: { type: String, default: 'System' },
  link: { type: String, default: null },
  priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  read: { type: Boolean, default: false, index: true },
}, opts)

const settingsSchema = new Schema({
  user: { type: String, required: true, unique: true },
  task: { type: Boolean, default: true },
  leave: { type: Boolean, default: true },
  attendance: { type: Boolean, default: true },
  meeting: { type: Boolean, default: true },
  project: { type: Boolean, default: true },
  announcement: { type: Boolean, default: true },
  admin: { type: Boolean, default: true },
  chat: { type: Boolean, default: true },
  push: { type: Boolean, default: true },
  emailDigest: { type: Boolean, default: false },
}, opts)

export const Notification = model('Notification', notificationSchema)
export const NotificationSettings = model('NotificationSettings', settingsSchema)
