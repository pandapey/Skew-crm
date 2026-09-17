import mongoose from 'mongoose'

const { Schema, model } = mongoose
const opts = { timestamps: true }

const attendanceSchema = new Schema({
  employee: { type: String, required: true, index: true },
  empCode: String,
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
  department: { type: String, index: true },
  date: { type: String, required: true, index: true },
  shift: { type: String, default: 'General' },
  checkIn: String,
  checkOut: String,
  checkInAt: { type: Date },
  checkOutAt: { type: Date },
  checkInSeconds: { type: Number },
  checkOutSeconds: { type: Number },
  durationSecs: { type: Number },
  timezone: { type: String },
  breakMins: { type: Number, default: 0 },
  breakSecs: { type: Number, default: 0 },
  breaks: [{ start: Date, end: Date, seconds: { type: Number, default: 0 } }],
  workingHours: { type: Number, default: 0 },
  late: { type: Boolean, default: false },
  earlyExit: { type: Boolean, default: false },
  onBreak: { type: Boolean, default: false },
  status: { type: String, enum: ['Present', 'Late', 'Early Exit', 'Absent', 'On Leave', 'Not Marked'], default: 'Not Marked', index: true },
  geo: { lat: Number, lng: Number },
}, opts)
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true })
attendanceSchema.index({ employee: 'text', empCode: 'text', department: 'text' })
attendanceSchema.index({ employeeId: 1 })

const shiftSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, uppercase: true },
  start: { type: String, required: true },
  end: { type: String, required: true },
  hours: { type: Number, default: 9 },
  graceMins: { type: Number, default: 15 },
  color: { type: String, default: '#2563EB' },
}, opts)
shiftSchema.index({ name: 'text', code: 'text' })

const holidaySchema = new Schema({
  name: { type: String, required: true },
  date: { type: String, required: true },
  day: String,
  type: { type: String, enum: ['Public', 'National', 'Festival', 'Optional'], default: 'Public' },
}, opts)
holidaySchema.index({ name: 'text' })

export const Attendance = model('Attendance', attendanceSchema)
export const Shift = model('Shift', shiftSchema)
export const Holiday = model('Holiday', holidaySchema)
