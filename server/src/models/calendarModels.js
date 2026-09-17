import mongoose from 'mongoose'

const recurrenceSchema = new mongoose.Schema(
  {
    freq: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
      default: 'none',
    },
    interval: { type: Number, default: 1, min: 1 },
    byWeekday: { type: [Number], default: [] },
    until: { type: Date, default: null },
    count: { type: Number, default: null },
  },
  { _id: false }
)

const calendarEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    type: {
      type: String,
      enum: [
        'meeting', 'task', 'event', 'deadline', 'holiday',
        'birthday', 'training', 'leave-approved', 'leave-pending', 'leave-rejected',
        'company-event','project-start', 'project-deadline', 'milestone', 'task-deadline', 'sunday',
      ],
      default: 'event',
      index: true,
    },
    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true },
    allDay: { type: Boolean, default: false },
    location: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    attendees: { type: [String], default: [] },
    clientId: { type: String, default: null, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    meetingStatus: { type: String, enum: ['Pending', 'Approved', 'Cancelled', 'Rejected'], default: null },
    requestedBy: { type: String, enum: ['client', 'staff'], default: null },
    reminderSentAt: { type: Date, default: null },
    recurrence: { type: recurrenceSchema, default: () => ({}) },
    done: { type: Boolean, default: false },
    createdBy: { type: String, default: null },
  },
  { timestamps: true }
)

calendarEventSchema.index({ start: 1, end: 1 })

export const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema)
