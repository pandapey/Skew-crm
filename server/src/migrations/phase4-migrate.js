import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { User, LEGACY_ROLE_MAP } from '../models/User.js'
import { LeaveRequest } from '../models/leaveModels.js'
import { ProjectTask, Project } from '../models/projectModels.js'

dotenv.config()

const DRY = process.argv.includes('--dry-run')
const out = []
const say = (msg) => { out.push(msg); console.log(msg) }

async function migrateUserRoles() {
  say('\n[1/4] User roles')
  for (const [legacy, target] of Object.entries(LEGACY_ROLE_MAP)) {
    const count = await User.countDocuments({ role: legacy })
    if (!count) { say(`      ${legacy.padEnd(12)} -> ${target.padEnd(6)} : none found`); continue }
    if (!DRY) await User.updateMany({ role: legacy }, { $set: { role: target } })
    say(`      ${legacy.padEnd(12)} -> ${target.padEnd(6)} : ${count} user(s) migrated`)
  }
}

async function migrateRolesAndPermissions() {
  say('\n[2/4] Role catalogue & permission matrix')
  const db = mongoose.connection.db

  const roles = await db.listCollections({ name: 'roles' }).toArray()
  if (roles.length) {
    for (const legacy of Object.keys(LEGACY_ROLE_MAP)) {
      const n = await db.collection('roles').countDocuments({ name: legacy })
      if (n && !DRY) await db.collection('roles').deleteMany({ name: legacy })
      if (n) say(`      removed retired role record: ${legacy} (${n})`)
    }
  } else {
    say('      no `roles` collection present — skipped')
  }

  const perms = await db.listCollections({ name: 'permissions' }).toArray()
  if (!perms.length) { say('      no `permissions` collection present — skipped'); return }

  const RANK = { Deny: 0, View: 1, Full: 2 }
  const docs = await db.collection('permissions').find({}).toArray()
  for (const doc of docs) {
    const matrix = doc.matrix || doc
    let changed = false
    for (const [legacy, target] of Object.entries(LEGACY_ROLE_MAP)) {
      if (!matrix[legacy]) continue
      matrix[target] = matrix[target] || {}
      for (const [mod, level] of Object.entries(matrix[legacy])) {
        const current = matrix[target][mod]
        if (RANK[level] > (RANK[current] ?? -1)) matrix[target][mod] = level
      }
      delete matrix[legacy]
      changed = true
      say(`      merged permission row ${legacy} -> ${target}`)
    }
    if (changed && !DRY) {
      await db.collection('permissions').updateOne({ _id: doc._id }, { $set: doc.matrix ? { matrix } : matrix })
    }
  }
}

async function migrateLeaveRequests() {
  say('\n[3/4] Leave requests')
  const missingFlags = await LeaveRequest.countDocuments({ halfDay: { $exists: false } })
  if (missingFlags && !DRY) {
    await LeaveRequest.updateMany(
      { halfDay: { $exists: false } },
      { $set: { halfDay: false, halfDaySession: null, sundaysExcluded: 0 } }
    )
  }
  say(`      backfilled half-day/Sunday fields on ${missingFlags} request(s)`)

  const decided = await LeaveRequest.find({
    status: { $in: ['Approved', 'Rejected'] },
    $or: [{ decision: null }, { decision: { $exists: false } }],
  })
  let rebuilt = 0
  for (const req of decided) {
    const step = [...(req.workflow || [])].reverse().find((w) => w.stage === req.status)
    req.decision = {
      action: req.status,
      comment: (step?.note || '').trim() || '(no comment recorded — decided before Phase 4)',
      by: step?.by || req.approver || 'Unknown',
      at: step?.at || req.updatedAt || req.appliedAt,
    }
    if (!DRY) await req.save()
    rebuilt += 1
  }
  say(`      rebuilt decision record on ${rebuilt} historical request(s)`)
}

async function migrateTasks() {
  say('\n[4/4] Project tasks')
  const missing = await ProjectTask.countDocuments({ submissionStatus: { $exists: false } })
  if (missing && !DRY) {
    await ProjectTask.updateMany(
      { submissionStatus: { $exists: false } },
      { $set: { submissionStatus: 'Not Submitted', submission: null, review: null, submissionHistory: [], reviewHistory: [] } }
    )
  }
  say(`      initialised submission workflow on ${missing} task(s)`)

  const tasks = await ProjectTask.find({ $or: [{ assignedBy: null }, { assignedBy: { $exists: false } }] })
  const projects = new Map((await Project.find().select('_id lead').lean()).map((p) => [String(p._id), p.lead]))
  let filled = 0
  for (const t of tasks) {
    const who = t.reporter || projects.get(String(t.project)) || null
    if (!who) continue
    t.assignedBy = who
    if (!DRY) await t.save()
    filled += 1
  }
  say(`      backfilled assignedBy on ${filled} task(s)`)
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGO_URI is not set. Aborting without changes.')
    process.exit(1)
  }
  await mongoose.connect(uri)
  say(`Connected. Mode: ${DRY ? 'DRY RUN (no writes)' : 'APPLY'}`)

  await migrateUserRoles()
  await migrateRolesAndPermissions()
  await migrateLeaveRequests()
  await migrateTasks()

  const leftover = await User.countDocuments({ role: { $in: Object.keys(LEGACY_ROLE_MAP) } })
  say(`\nVerification: ${leftover} user(s) still hold a retired role (expected 0${DRY ? ' after apply' : ''}).`)

  await mongoose.disconnect()
  say('Done.')
}

main().catch((err) => { console.error(err); process.exit(1) })
