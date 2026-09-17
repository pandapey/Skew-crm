import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { Client, Plan } from '../models/clientModels.js'

dotenv.config()

const CONFIRM = process.argv.includes('--confirm')

const LEGACY_HARDCODED_PLANS = ['Enterprise', 'Professional', 'Business', 'Starter']

const codeFor = (name) => String(name).replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase()

async function main() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    console.error('MONGO_URI is not set. Aborting.')
    process.exit(1)
  }

  await mongoose.connect(uri)
  console.log(`Connected: ${uri}`)
  console.log(CONFIRM ? 'MODE: --confirm (WILL WRITE)' : 'MODE: dry run (no writes)\n')

  const inUse = (await Client.distinct('plan'))
    .map((p) => String(p || '').trim())
    .filter(Boolean)

  const wanted = []
  const seen = new Set()
  for (const name of [...inUse, ...LEGACY_HARDCODED_PLANS]) {
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    wanted.push(name)
  }

  console.log(`Plans referenced by existing clients : ${inUse.length ? inUse.join(', ') : '(none)'}`)
  console.log(`Legacy hardcoded dropdown options    : ${LEGACY_HARDCODED_PLANS.join(', ')}`)
  console.log(`Candidate catalogue entries          : ${wanted.join(', ')}\n`)

  let created = 0
  let skipped = 0

  for (const name of wanted) {
    const exists = await Plan.findOne({
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    }).lean()

    if (exists) {
      console.log(`  skip   "${name}" — already in the catalogue as "${exists.name}"`)
      skipped += 1
      continue
    }

    if (!CONFIRM) {
      console.log(`  would insert "${name}" (code ${codeFor(name)}, status Active)`)
      created += 1
      continue
    }

    await Plan.create({
      name,
      code: codeFor(name),
      description: `Backfilled from existing client data on ${new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}.`,
      price: 0,
      status: 'Active',
    })
    console.log(`  insert "${name}"`)
    created += 1
  }

  console.log(`\n${CONFIRM ? 'Inserted' : 'Would insert'}: ${created}   Skipped (already present): ${skipped}`)
  if (!CONFIRM) {
    console.log('Nothing was written. Re-run with --confirm to apply.')
  }

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
