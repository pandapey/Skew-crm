import mongoose from 'mongoose'

const { Schema, model } = mongoose
const opts = { timestamps: true }

const roleSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  protected: { type: Boolean, default: false },
  system: { type: Boolean, default: false },
}, opts)

const permissionSchema = new Schema({
  key: { type: String, default: 'default', unique: true },
  matrix: { type: Object, default: {} },
}, opts)

const apiKeySchema = new Schema({
  name: { type: String, required: true, trim: true },
  key: { type: String, required: true, unique: true },
  scopes: { type: [String], default: ['read'] },
  env: { type: String, enum: ['Production', 'Staging', 'Development'], default: 'Production' },
  status: { type: String, enum: ['Active', 'Revoked'], default: 'Active' },
  lastUsed: { type: String, default: '—' },
  createdAt: { type: String, default: () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) },
  createdBy: { type: String, default: 'System' },
}, opts)

const auditLogSchema = new Schema({
  user: { type: String, default: 'System' },

  actor: { type: String, default: 'System' },
  action: { type: String, required: true },
  module: { type: String, default: 'Admin' },
  severity: { type: String, enum: ['Info', 'Warning', 'Critical'], default: 'Info' },
  ip: { type: String, default: 'localhost' },
  at: { type: Date, default: Date.now },
}, opts)

auditLogSchema.index({ module: 1, severity: 1 })
auditLogSchema.index({ at: -1 })

const systemLogSchema = new Schema({
  level: { type: String, enum: ['INFO', 'WARN', 'ERROR', 'DEBUG'], default: 'INFO' },
  source: { type: String, default: 'api-gateway' },
  message: { type: String, required: true },
  at: { type: Date, default: Date.now },
}, opts)

const backupSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Full', 'Incremental', 'Differential'], default: 'Full' },
  size: { type: Number, default: 0 },
  createdAt: { type: String, default: () => new Date().toLocaleString('en-CA', { timeZone: 'Asia/Kolkata', hour12: false }).replace(',', '') },
  status: { type: String, enum: ['Completed', 'In Progress', 'Failed'], default: 'Completed' },
  createdBy: { type: String, default: 'System' },
  durationSec: { type: Number, default: 0 },
  kind: { type: String, enum: ['Backup', 'Snapshot'], default: 'Backup' },
  file: { type: String, default: '' },
  error: { type: String, default: '' },
}, opts)

const settingSchema = new Schema({
  category: { type: String, required: true, unique: true },
  data: { type: Object, default: {} },
}, opts)

const activitySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  user: { type: String, required: true },
  role: { type: String, default: 'Employee' },
  device: { type: String, default: 'Unknown' },
  browser: { type: String, default: 'Unknown' },
  os: { type: String, default: 'Unknown' },
  ip: { type: String, default: '0.0.0.0' },
  location: { type: String, default: 'Unknown' },
  startedAt: { type: Date, default: Date.now },
  logoutAt: { type: Date, default: null },
  currentUrl: { type: String, default: '/' },
  active: { type: Boolean, default: true },
}, opts)

activitySchema.index({ user: 1 })
activitySchema.index({ userId: 1, startedAt: -1 })
activitySchema.index({ startedAt: -1 })

export const Role = model('Role', roleSchema)
export const Permission = model('Permission', permissionSchema)
export const ApiKey = model('ApiKey', apiKeySchema)
export const AuditLog = model('AuditLog', auditLogSchema)
export const SystemLog = model('SystemLog', systemLogSchema)
export const Backup = model('Backup', backupSchema)
export const Setting = model('Setting', settingSchema)
export const Activity = model('Activity', activitySchema)
