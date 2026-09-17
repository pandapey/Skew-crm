import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

import { User } from './models/User.js'
import { Employee } from './models/Employee.js'
import { STAFF_ROLES, linkUserToEmployee, linkEmployeeToUser } from './services/identityLink.js'

const uri = process.env.MONGODB_URI || 'mongodb+srv://teammate282024_db_user:LJczRHTLAxg5itd2@cluster0.aqys1ru.mongodb.net/Skew?appName=Cluster0'

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  console.log('Connected. Reconciling Users <-> Employees...')

  const users = await User.find({ role: { $in: STAFF_ROLES } }).lean()
  let userLinked = 0
  for (const u of users) {
    const emp = await linkUserToEmployee(u)
    if (emp) userLinked++
  }
  console.log(`Users -> Employees: ${userLinked}/${users.length} linked/created`)

  const employees = await Employee.find({}).lean()
  let empProcessed = 0
  const creds = []
  for (const e of employees) {
    const { credentials } = await linkEmployeeToUser(e)
    empProcessed++
    if (credentials) creds.push(credentials)
  }
  console.log(`Employees -> Users: ${empProcessed}/${employees.length} processed`)

  if (creds.length) {
    console.log(`\nCreated ${creds.length} login account(s) with temp passwords:`)
    creds.forEach((c) => console.log(`  ${c.email} : ${c.temporaryPassword}`))
  } else {
    console.log('\nNo new login accounts were needed.')
  }

  await mongoose.disconnect()
  console.log('Reconcile complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
