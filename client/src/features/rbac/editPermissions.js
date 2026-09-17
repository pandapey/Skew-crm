import { useAuth } from '@/hooks/useAuth'
import { ROLES } from '@/constants'
import { ADMIN_WRITE_ROLES } from '@/features/admin/constants'
import { ATTENDANCE_WRITE_ROLES } from '@/features/attendance/constants'
import { FINANCE_WRITE_ROLES } from '@/features/finance/constants'
import { HR_WRITE_ROLES } from '@/features/hr/constants'
import { PROJECT_WRITE_ROLES } from '@/features/projects/constants'

export const SELF_ONLY = 'SELF_ONLY'

export const MODULE_EDIT_ROLES = {
  users: ADMIN_WRITE_ROLES,
  clients: ADMIN_WRITE_ROLES,
  roles: ADMIN_WRITE_ROLES,

  departments: HR_WRITE_ROLES,
  designations: HR_WRITE_ROLES,
  employees: HR_WRITE_ROLES,
  leaveTypes: HR_WRITE_ROLES,
  recruitment: HR_WRITE_ROLES,
  interviews: HR_WRITE_ROLES,
  offers: HR_WRITE_ROLES,
  movements: HR_WRITE_ROLES,
  performance: HR_WRITE_ROLES,

  attendance: ATTENDANCE_WRITE_ROLES,
  shifts: ATTENDANCE_WRITE_ROLES,
  holidays: ATTENDANCE_WRITE_ROLES,

  projects: PROJECT_WRITE_ROLES,
  tasks: PROJECT_WRITE_ROLES,
  documents: PROJECT_WRITE_ROLES,
  announcements: PROJECT_WRITE_ROLES,
  calendarEvents: PROJECT_WRITE_ROLES,

  payroll: FINANCE_WRITE_ROLES,

  ownProfile: SELF_ONLY,
}

export function useCanEdit(moduleKey, opts = {}) {
  const { user, hasRole } = useAuth()
  const allowed = MODULE_EDIT_ROLES[moduleKey]

  if (!allowed) return false

  if (allowed === SELF_ONLY) {
    if (!opts.ownerId) return false
    if (hasRole(ROLES.ADMIN)) return true
    return String(opts.ownerId) === String(user?.id ?? user?._id ?? '')
  }

  return hasRole(allowed)
}

export function canEditWith(hasRole, moduleKey) {
  const allowed = MODULE_EDIT_ROLES[moduleKey]
  if (!allowed || allowed === SELF_ONLY) return false
  return hasRole(allowed)
}
