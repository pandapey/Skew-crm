import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { User } from '../models/User.js'

dotenv.config()

const DRY = process.argv.includes('--dry-run')
const say = (msg) => { console.log(msg) }

const RETIRED_ROLES = ['HR', 'Sales', 'Finance', 'Inventory']
const ABSORBED_BY = 'Manager'

const RANK = { Deny: 0, View: 1, Full: 2 }

async function migrateUserRoles() {
  say('\n[1/2] User roles \u2014 HR (and legacy Sales/Finance/Inventory) -> Manager')
  for (const retired of RETIRED_ROLES) {
    const count = await User.countDocuments({ role: retired })
    if (!count) {
      say(`      no users hold the ${retired} role`)
      continue
    }
    if (!DRY) await User.updateMany({ role: retired }, { $set: { role: ABSORBED_BY } })
    say(`      ${count} user(s) migrated ${retired} -> ${ABSORBED_BY}`)
  }
  say('      ACTION REQUIRED: review these accounts. Manager is the merged')
  say('      role and carries exactly the former HR + Manager permissions.')

  const db = mongoose.connection.db

  const roleCols = await db.listCollections({ name: 'roles' }).toArray()
  if (roleCols.length) {
    const n = await db.collection('roles').countDocuments({ name: RETIRED_ROLES[0] })
    if (n && !DRY) await db.collection('roles').deleteMany({ name: RETIRED_ROLES[0] })
    say(n ? `      removed retired role record: HR (${n})` : '      role catalogue already clean')
  } else {
    say('      no `roles` collection present \u2014 skipped')
  }
}

async function migratePermissions() {
  say('\n[2/2] Permission matrix \u2014 fold HR into Manager, then drop HR')

  const db = mongoose.connection.db
  const permCols = await db.listCollections({ name: 'permissions' }).toArray()
  if (!permCols.length) {
    say('      no `permissions` collection present \u2014 skipped')
    return
  }
  const doc = await db.collection('permissions').findOne({ key: 'default' })
  const matrix = doc?.matrix
  if (!matrix || !matrix.HR) {
    say('      permission matrix has no HR row \u2014 nothing to fold')
    return
  }
  const target = { ...(matrix[ABSORBED_BY] || {}) }
  let upgrades = 0
  for (const [mod, level] of Object.entries(matrix.HR)) {
    const currentRank = RANK[target[mod]] ?? -1
    if ((RANK[level] ?? 0) > currentRank) { target[mod] = level; upgrades += 1 }
  }
  const next = { ...matrix, [ABSORBED_BY]: target }
  delete next.HR
  if (!DRY) {
    await db.collection('permissions').updateOne({ key: 'default' }, { $set: { matrix: next } })
  }
  say(`      folded HR permissions into Manager (${upgrades} module(s) upgraded), removed HR row`)
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
  await migratePermissions()

  const leftover = await User.countDocuments({ role: { $in: RETIRED_ROLES } })
  say(`\nVerification:`)
  say(`  users still holding a retired role : ${leftover} (expected 0${DRY ? ' after apply' : ''})`)

  await mongoose.disconnect()
  say('Done.')
}

main().catch((err) => { console.error(err); process.exit(1) })
