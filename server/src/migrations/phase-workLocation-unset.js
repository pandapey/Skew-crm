import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const CONFIRM = process.argv.includes('--confirm')

async function main() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    console.error('MONGO_URI is not set. Aborting.')
    process.exit(1)
  }

  await mongoose.connect(uri)
  const db = mongoose.connection.db
  console.log(`Connected: ${uri}`)
  console.log(CONFIRM ? 'MODE: --confirm (WILL WRITE)' : 'MODE: dry run (no writes)\n')

  for (const name of ['employees', 'users']) {
    const col = db.collection(name)
    const affected = await col.countDocuments({ workLocation: { $exists: true } })
    console.log(`${name}: ${affected} document(s) still store \`workLocation\``)

    if (!affected) continue
    if (!CONFIRM) {
      console.log(`  dry run — would run: db.${name}.updateMany({ workLocation: { $exists: true } }, { $unset: { workLocation: "" } })`)
      continue
    }
    const res = await col.updateMany(
      { workLocation: { $exists: true } },
      { $unset: { workLocation: '' } },
    )
    console.log(`  $unset applied to ${res.modifiedCount} document(s)`)
  }

  if (!CONFIRM) {
    console.log('\nNothing was written. Re-run with --confirm to apply.')
  }

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
