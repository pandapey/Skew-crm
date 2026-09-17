import { User } from '../models/User.js'
import { ApiError } from '../utils/asyncHandler.js'
import { generateTempPassword, validatePassword } from '../utils/password.js'

const plainMk = async (Model, doc) => (await Model.create([doc]))[0]

export async function provisionClientLogin({
  client,
  email = '',
  password = '',
  session = null,
  mk = plainMk,
  rb = null,
} = {}) {
  if (!client?.clientId) throw new ApiError(400, 'A persisted client is required to provision a login.')

  const q = (m) => (session ? m.session(session) : m)

  let portalUser = await q(User.findOne({ role: 'Client', clientId: client.clientId }))
  if (portalUser) return { portalUser, credentials: null, created: false }

  const loginEmail = String(email || client.email || '').toLowerCase().trim()
  if (!loginEmail) {
    throw new ApiError(400, 'An email address is required to create a client portal login.')
  }

  const existingUser = await q(User.findOne({ email: loginEmail }))
  if (existingUser) {
    if (existingUser.role !== 'Client') {
      throw new ApiError(409, `${loginEmail} already belongs to a ${existingUser.role} account.`)
    }
    if (!existingUser.clientId) {
      await User.updateOne(
        { _id: existingUser._id },
        { $set: { clientId: client.clientId } },
        session ? { session } : {},
      )
    }
    return { portalUser: existingUser, credentials: null, created: false }
  }

  let credentials = null
  let plain = String(password || '')
  if (plain) {
    if (!validatePassword(plain).valid) {
      throw new ApiError(400, 'Password does not meet the required policy (8-64 chars, upper, lower, number, special).')
    }
  } else {
    plain = generateTempPassword()
    credentials = { email: loginEmail, temporaryPassword: plain }
  }

  portalUser = await mk(User, {
    name: client.contactPerson || client.company,
    email: loginEmail,
    password: plain,
    role: 'Client',
    clientId: client.clientId,
    phone: client.phone || '',
    status: 'Active',
  }, session)
  if (rb) rb.add(() => User.deleteOne({ _id: portalUser._id }))

  return { portalUser, credentials, created: true }
}
