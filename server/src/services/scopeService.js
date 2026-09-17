import { Project } from '../models/projectModels.js'
import { User } from '../models/User.js'
import { ApiError } from '../utils/asyncHandler.js'

export const UNSCOPED_ROLES = ['Admin', 'Manager']

export const isUnscoped = (user) => UNSCOPED_ROLES.includes(user?.role)

const norm = (v) => String(v || '').trim()
const lower = (v) => norm(v).toLowerCase()

export const getManagerClientCompanies = async (user) => {
  const name = norm(user?.name)
  if (!name) return []
  const projects = await Project.find({
    $or: [{ lead: name }, { 'members.name': name }],
  }).select('client').lean()
  const companies = projects.map((p) => norm(p.client)).filter(Boolean)
  return [...new Set(companies)]
}

export const getManagerTeamEmails = async (user) => {
  const name = norm(user?.name)
  const team = Array.isArray(user?.reportingTeam) ? user.reportingTeam.filter(Boolean) : []
  const or = []
  if (name) or.push({ reportingManager: name })
  if (team.length) {
    or.push({ name: { $in: team.map(norm) } })
    or.push({ email: { $in: team.map(lower) } })
  }
  if (!or.length) return []
  const users = await User.find({ $or: or }).select('email').lean()
  return [...new Set(users.map((u) => lower(u.email)).filter(Boolean))]
}

export const buildClientScopeFilter = async (user) => {
  if (isUnscoped(user)) return null
  return { _id: { $in: [] } }
}

export const assertCanReadClient = async (user) => {
  if (isUnscoped(user)) return
  throw new ApiError(403, 'Forbidden: insufficient permissions')
}

export const assertCanAccessClient = async (user) => {
  if (isUnscoped(user)) return
  throw new ApiError(403, 'Forbidden: insufficient permissions')
}

export const assertCanEditEmployee = async (user) => {
  if (isUnscoped(user)) return
  throw new ApiError(403, 'Forbidden: insufficient permissions')
}

export const scopeService = {
  UNSCOPED_ROLES,
  isUnscoped,
  getManagerClientCompanies,
  getManagerTeamEmails,
  buildClientScopeFilter,
  assertCanReadClient,
  assertCanAccessClient,
  assertCanEditEmployee,
}

export default scopeService
