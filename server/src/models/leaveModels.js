import mongoose from 'mongoose'

const { Schema, model } = mongoose
const opts = { timestamps: true }

const leaveTypeSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, uppercase: true },
  allocated: { type: Number, default: 0 },
  color: { type: String, default: '#2563EB' },
  paid: { type: Boolean, default: true },
  carryForward: { type: Boolean, default: false },
  active: { type: Boolean, default: true },

  genderRestriction: { type: String, enum: ['Any', 'Male', 'Female'], default: 'Any' },
}, opts)
leaveTypeSchema.index({ name: 'text', code: 'text' })

const leaveBalanceSchema = new Schema({
  employee: { type: String, required: true, index: true },
  type: { type: String, required: true },
  code: String,
  color: String,
  allocated: { type: Number, default: 0 },
  used: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
}, opts)
leaveBalanceSchema.index({ employee: 1, type: 1 }, { unique: true })

const workflowStepSchema = new Schema({
  stage: String,
  by: String,
  at: { type: Date, default: Date.now },
  note: String,
  done: { type: Boolean, default: true },
}, { _id: false })

const leaveDecisionSchema = new Schema({
  action: { type: String, enum: ['Approved', 'Rejected'] },
  comment: { type: String, trim: true },
  by: String,
  at: { type: Date },
}, { _id: false })

const leaveRequestSchema = new Schema({
  employee: { type: String, required: true, index: true },
  empCode: String,
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
  department: { type: String, index: true },
  type: { type: String, required: true },
  typeCode: String,
  from: { type: String, required: true },
  to: { type: String, required: true },
  days: { type: Number, required: true, min: 0 },
  reason: { type: String, required: true },

  halfDay: { type: Boolean, default: false },
  halfDaySession: { type: String, enum: ['First Half', 'Second Half', null], default: null },

  sundaysExcluded: { type: Number, default: 0 },

  requestKind: {
    type: String,
    enum: ['Leave', 'Hourly Permission'],
    default: 'Leave',
    index: true,
  },
  hours: { type: Number, default: null, min: 0 },

  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Cancelled', 'Expired'], default: 'Pending', index: true },
  appliedAt: { type: Date, default: Date.now },
  approver: String,

  expiresAt: { type: Date, default: null, index: true },
  expiredAt: { type: Date, default: null },
  remindersSent: { type: [String], default: [] },
  decision: { type: leaveDecisionSchema, default: null },
  workflow: [workflowStepSchema],
}, opts)
leaveRequestSchema.index({ employee: 'text', empCode: 'text', reason: 'text' })

export const LeaveType = model('LeaveType', leaveTypeSchema)
export const LeaveBalance = model('LeaveBalance', leaveBalanceSchema)
export const LeaveRequest = model('LeaveRequest', leaveRequestSchema)
